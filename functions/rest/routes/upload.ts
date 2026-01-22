import { Hono } from 'hono'
import { Ok, Fail, Build, ImgItem } from '../type'
import type { User } from '../type'
import { checkFileType, getFileName } from '../utils'
import { auth, type AppEnv } from '../middleware/auth'
import { uploadRateLimit } from '../middleware/rateLimit'
import { getStorageProvider } from '../storage'

const uploadRoutes = new Hono<AppEnv>()

// batch upload file (with rate limiting)
uploadRoutes.post('/upload', uploadRateLimit, auth, async (c) => {
    const files = await c.req.formData()
    const images = files.getAll("files")
    let customPath = files.get("path")
    const keepName = files.get("keepName") === 'true'
    const expireAt = files.get("expireAt")

    // Get authenticated user info from context
    const user = c.get('user') as User | undefined
    const storage = getStorageProvider(c)
    const storageType = c.env.STORAGE_TYPE || 'R2'

    if (customPath) {
        customPath = customPath.toString()
        if (!customPath.endsWith('/')) {
            customPath += '/'
        }
        // Remove leading slash if present to avoid double slashes with base URL or empty bucket names
        if (customPath.startsWith('/')) {
            customPath = customPath.substring(1)
        }
    } else {
        customPath = ''
    }

    const errs: string[] = []
    const urls = Array<ImgItem>()
    for (let item of images) {
        const file = item as File
        const fileType = file.type
        if (!checkFileType(fileType)) {
            errs.push(`${fileType} not support.`)
            continue
        }
        const delToken = crypto.randomUUID()
        const time = new Date().getTime()

        let filename = ''
        const originalName = file.name
        if (keepName && file.name) {
            // Sanitize filename: replace non-alphanumeric chars (except ._- and Chinese) with _
            // This ensures compatibility with R2 keys and URLs
            // Note: Hyphen must be at the end of character class to avoid creating unintended ranges
            const safeName = file.name.replace(/[^a-zA-Z0-9._\u4e00-\u9fa5-]/g, '_')
            console.log(`KeepName: ${keepName}, Original: ${file.name}, SafeData: ${safeName}`)
            if (safeName) {
                filename = safeName
            }
        }

        // Fallback or default filename generation
        if (!filename) {
            filename = await getFileName(fileType, time)
        }

        const fullPath = customPath + filename

        // If keeping original name, check if file already exists to prevent overwrite
        if (keepName) {
            const existing = await storage.head(fullPath)
            if (existing) {
                errs.push(`${file.name}: File already exists`)
                continue
            }
        }

        const metadata: Record<string, string> = {}
        metadata['delToken'] = delToken
        // 记录原始文件名称
        if (!keepName && originalName) {
            metadata['originalName'] = originalName
        }
        if (expireAt) {
            metadata['expires'] = expireAt.toString()
        }

        // Securely attach User Info to metadata
        if (user) {
            metadata['uploaderId'] = user.id.toString()
            metadata['uploadedBy'] = user.login
            // Store full name if available, handle potential unicode
            if (user.name) {
                metadata['uploaderName'] = encodeURIComponent(user.name)
            }
        }

        const object = await storage.put(fullPath, file.stream(), {
            contentType: fileType,
            metadata: metadata
        })

        if (object && object.key) {
            const finalSize = object.size || file.size
            // 存储删除token
            await c.env.XK.put(`del:${delToken}`, object.key)

            // 同步图片信息到 D1 数据库
            if (user) {
                console.log(`[Upload] Syncing to DB - key: ${object.key}, user_login: ${user.login}`)
                c.executionCtx.waitUntil(
                    c.env.DB.prepare(
                        `INSERT INTO images (key, user_id, user_login, original_name, size, mime_type, folder, expires_at, storage_type) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
                    ).bind(
                        object.key,
                        null,  // user_id 设为 null，避免外键约束失败（JWT 中的 id 是 GitHub ID）
                        user.login,
                        originalName || null,
                        finalSize,
                        fileType,
                        customPath || '',
                        expireAt ? new Date(parseInt(expireAt.toString())).toISOString() : null,
                        storageType
                    ).run().then((result) => {
                        console.log(`[Upload] Image inserted to DB successfully - key: ${object.key}, meta: ${JSON.stringify(result.meta)}`)
                        // 更新用户统计
                        return c.env.DB.prepare(
                            `UPDATE users SET 
                                storage_used = storage_used + ?, 
                                upload_count = upload_count + 1 
                             WHERE login = ?`
                        ).bind(finalSize, user.login).run()
                    }).then((result) => {
                        console.log(`[Upload] User stats updated - login: ${user.login}, meta: ${JSON.stringify(result.meta)}`)
                        // 记录上传审计日志
                        return c.env.DB.prepare(
                            `INSERT INTO audit_logs (user_id, user_login, action, target_key, details) 
                             VALUES (?, ?, 'upload', ?, ?)`
                        ).bind(user.id, user.login, object.key, JSON.stringify({ size: finalSize, originalName: originalName, storageType })).run()
                    }).catch(e => {
                        console.error(`[Upload] Failed to sync image to DB - key: ${object.key}, error:`, e)
                    })
                )
            } else {
                console.log(`[Upload] No user context, skipping DB sync - key: ${object.key}`)
            }

            urls.push({
                key: object.key,
                size: finalSize,
                url: storage.getPublicUrl(object.key),
                filename: file.name,
                delToken: delToken,
                storageType: storageType as 'R2' | 'HF'
            })
        }
        return c.json(Build(urls, errs.toString()))
    })

export default uploadRoutes
