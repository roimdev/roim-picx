import { Hono } from 'hono'
import type { R2ListOptions, D1Database } from '@cloudflare/workers-types'
import { Ok, Fail, ImgItem, ImgList, ImgReq } from '../type'
import type { User, DbImage } from '../type'
import { parseRange } from '../utils'
import { auth, type AppEnv } from '../middleware/auth'
import { listRateLimit } from '../middleware/rateLimit'

const imageRoutes = new Hono<AppEnv>()

/**
 * 检查用户是否可以查看所有图片
 * - 使用管理员 Token 登录
 * - 用户角色是 admin
 * - 用户被授权 canViewAll
 */
function canViewAllImages(user: User | undefined, isAdminToken: boolean): boolean {
    if (isAdminToken) return true
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.canViewAll) return true
    return false
}

// list image (with rate limiting) - 从 D1 数据库查询
imageRoutes.post('/list', listRateLimit, auth, async (c) => {
    const user = c.get('user') as User | undefined
    const isAdminToken = c.get('isAdminToken') || false
    const viewAll = canViewAllImages(user, isAdminToken)

    const data = await c.req.json<ImgReq>()
    if (!data.limit) {
        data.limit = 10
    }
    if (data.limit > 100) {
        data.limit = 100
    }

    // 处理文件夹路径
    let folder = ''
    if (data.delimiter && data.delimiter !== '/') {
        folder = data.delimiter
        // 确保文件夹路径以 / 结尾
        if (!folder.endsWith('/')) {
            folder += '/'
        }
    }

    const keyword = data.keyword?.trim().toLowerCase()
    const offset = data.cursor ? parseInt(data.cursor) : 0

    try {
        // 构建 SQL 查询
        let query = 'SELECT * FROM images WHERE 1=1'
        let countQuery = 'SELECT COUNT(*) as total FROM images WHERE 1=1'
        const params: any[] = []
        const countParams: any[] = []

        // 权限过滤：非管理员只能看自己的图片
        if (!viewAll) {
            if (!user) {
                return c.json(Ok(<ImgList>{
                    list: [],
                    next: false,
                    cursor: undefined,
                    prefixes: [],
                    canViewAll: false
                }))
            }
            query += ' AND user_login = ?'
            countQuery += ' AND user_login = ?'
            params.push(user.login)
            countParams.push(user.login)
        }

        // 文件夹过滤
        if (folder) {
            query += ' AND folder = ?'
            countQuery += ' AND folder = ?'
            params.push(folder)
            countParams.push(folder)
        } else {
            // 根目录：只显示 folder 为空的图片
            query += " AND (folder = '' OR folder IS NULL)"
            countQuery += " AND (folder = '' OR folder IS NULL)"
        }

        // 关键词搜索
        if (keyword) {
            query += ' AND (LOWER(key) LIKE ? OR LOWER(original_name) LIKE ?)'
            countQuery += ' AND (LOWER(key) LIKE ? OR LOWER(original_name) LIKE ?)'
            const likePattern = `%${keyword}%`
            params.push(likePattern, likePattern)
            countParams.push(likePattern, likePattern)
        }

        // 过滤已过期的图片
        query += " AND (expires_at IS NULL OR expires_at > datetime('now'))"
        countQuery += " AND (expires_at IS NULL OR expires_at > datetime('now'))"

        // 排序和分页
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.push(data.limit + 1, offset)  // 多查一条用于判断是否还有更多

        // 执行查询
        const [result, countResult] = await Promise.all([
            c.env.DB.prepare(query).bind(...params).all(),
            c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>()
        ])

        const images = (result.results || []) as unknown as DbImage[]
        const hasMore = images.length > data.limit
        const limitedImages = images.slice(0, data.limit)

        // 转换为 ImgItem 格式
        const urls: ImgItem[] = limitedImages.map((img: DbImage) => ({
            url: `${c.env.BASE_URL}/rest/${img.key}`,
            key: img.key,
            size: img.size,
            originalName: img.original_name || undefined,
            uploadedBy: img.user_login,
            uploadedAt: img.created_at ? new Date(img.created_at).getTime() : undefined
        }))

        // 获取子文件夹列表（如果不是搜索模式）
        let prefixes: string[] = []
        if (!keyword) {
            const folderQuery = viewAll
                ? `SELECT DISTINCT folder FROM images 
                   WHERE folder LIKE ? AND folder != ? AND folder IS NOT NULL
                   AND (expires_at IS NULL OR expires_at > datetime('now'))`
                : `SELECT DISTINCT folder FROM images 
                   WHERE user_login = ? AND folder LIKE ? AND folder != ? AND folder IS NOT NULL
                   AND (expires_at IS NULL OR expires_at > datetime('now'))`

            const folderParams = viewAll
                ? [`${folder}%`, folder]
                : [user!.login, `${folder}%`, folder]

            const folderResult = await c.env.DB.prepare(folderQuery).bind(...folderParams).all()

            // 提取直接子文件夹
            const subFolders = new Set<string>()
            const currentDepth = folder ? folder.split('/').filter(Boolean).length : 0

            for (const row of (folderResult.results || []) as { folder: string }[]) {
                const parts = row.folder.split('/').filter(Boolean)
                if (parts.length > currentDepth) {
                    // 获取下一级文件夹
                    const nextFolder = parts.slice(0, currentDepth + 1).join('/') + '/'
                    subFolders.add(nextFolder)
                }
            }
            prefixes = Array.from(subFolders).sort()
        }

        // 计算下一页的 cursor
        const nextCursor = hasMore ? String(offset + data.limit) : undefined

        return c.json(Ok(<ImgList>{
            list: urls,
            next: hasMore,
            cursor: nextCursor,
            prefixes: prefixes,
            canViewAll: viewAll,
            total: countResult?.total || 0
        }))
    } catch (e) {
        console.error('Failed to list images from DB:', e)
        return c.json(Fail(`查询失败: ${(e as Error).message}`))
    }
})

// 重命名文件
imageRoutes.post('/rename', auth, async (c) => {
    try {
        const data = await c.req.json<{ oldKey: string, newKey: string }>()
        if (!data.oldKey || !data.newKey) {
            return c.json(Fail("Missing oldKey or newKey"))
        }

        const oldObject = await c.env.PICX.get(data.oldKey)
        if (!oldObject) {
            return c.json(Fail("File not found"))
        }

        // Copy file to new key
        await c.env.PICX.put(data.newKey, oldObject.body, {
            httpMetadata: oldObject.httpMetadata,
            customMetadata: oldObject.customMetadata,
        })

        // Delete old file
        await c.env.PICX.delete(data.oldKey)

        // 同步更新 D1 数据库
        c.executionCtx.waitUntil(
            c.env.DB.prepare('UPDATE images SET key = ? WHERE key = ?')
                .bind(data.newKey, data.oldKey)
                .run()
                .catch(e => console.error('Failed to update image key in DB:', e))
        )

        // 记录审计日志
        const user = c.get('user') as User | undefined
        if (user) {
            c.executionCtx.waitUntil(
                c.env.DB.prepare(
                    `INSERT INTO audit_logs (user_id, user_login, action, target_key, details) 
                     VALUES (?, ?, 'rename', ?, ?)`
                ).bind(
                    user.id,
                    user.login,
                    data.newKey,
                    JSON.stringify({ oldKey: data.oldKey, newKey: data.newKey })
                ).run().catch(e => console.error('Failed to log rename:', e))
            )
        }

        return c.json(Ok({ oldKey: data.oldKey, newKey: data.newKey }))
    } catch (e) {
        return c.json(Fail(`Rename failed: ${(e as Error).message}`))
    }
})

/**
 * 从 D1 删除图片记录并更新用户统计
 */
async function deleteImageFromDb(db: D1Database, key: string): Promise<void> {
    try {
        // 获取图片信息用于更新用户统计
        const image = await db.prepare('SELECT user_login, size FROM images WHERE key = ?')
            .bind(key).first<{ user_login: string, size: number }>()

        if (image) {
            // 删除图片记录
            await db.prepare('DELETE FROM images WHERE key = ?').bind(key).run()

            // 更新用户存储统计
            await db.prepare(
                'UPDATE users SET storage_used = MAX(0, storage_used - ?) WHERE login = ?'
            ).bind(image.size, image.user_login).run()
        }
    } catch (e) {
        console.error('Failed to delete image from DB:', e)
    }
}

// 删除key (GET方式，保持兼容)
imageRoutes.get('/del/:id{.+}', async (c) => {
    const key = c.req.param('id')
    if (!key) {
        return c.json(Fail("not delete key"))
    }
    try {
        await c.env.PICX.delete(key)
        // 同步删除 D1 记录
        c.executionCtx.waitUntil(deleteImageFromDb(c.env.DB, key))
    } catch (e) {
        console.log(`img delete error:${(e as Error).message}`,)
    }
    return c.json(Ok(key))
})

// delete image (DELETE方式)
imageRoutes.delete("/", auth, async (c) => {
    const params = await c.req.json<{ keys: string }>()
    const keys = params.keys
    if (!keys || keys.length < 1) {
        return c.json(Fail("not delete keys"))
    }
    const arr = keys.split(',')
    const user = c.get('user') as User | undefined

    try {
        for (let it of arr) {
            if (it && it.length) {
                await c.env.PICX.delete(it)
                // 同步删除 D1 记录
                c.executionCtx.waitUntil(deleteImageFromDb(c.env.DB, it))

                // 记录审计日志
                if (user) {
                    c.executionCtx.waitUntil(
                        c.env.DB.prepare(
                            `INSERT INTO audit_logs (user_id, user_login, action, target_key) 
                             VALUES (?, ?, 'delete', ?)`
                        ).bind(user.id, user.login, it).run()
                            .catch(e => console.error('Failed to log delete:', e))
                    )
                }
            }
        }
    } catch (e) {
        console.log(`img delete error:${(e as Error).message}`,)
    }
    return c.json(Ok(keys))
})

// 获取删除链接信息 (公开)
imageRoutes.get('/delInfo/:token', async (c) => {
    const token = c.req.param('token')
    if (!token) {
        return c.json(Fail("token is required"))
    }
    const key = await c.env.XK.get(`del:${token}`)
    if (!key) {
        return c.json(Fail("Invalid or expired deletion link"))
    }
    const object = await c.env.PICX.head(key)
    if (!object) {
        return c.json(Fail("Image not found"))
    }

    return c.json(Ok({
        key: key,
        url: `${c.env.BASE_URL}/rest/${key}`,
        size: object.size,
        originalName: object.customMetadata?.originalName
    }))
})

// 确认删除图片 (公开)
imageRoutes.post('/delImage/:token', async (c) => {
    const token = c.req.param('token')
    if (!token) {
        return c.json(Fail("token is required"))
    }
    const key = await c.env.XK.get(`del:${token}`)
    if (!key) {
        return c.json(Fail("Invalid or expired deletion link"))
    }

    try {
        await c.env.PICX.delete(key)
        await c.env.XK.delete(`del:${token}`)
        return c.json(Ok("Delete success"))
    } catch (e) {
        return c.json(Fail(`Delete failed: ${(e as Error).message}`))
    }
})

// image detail - catch-all for image keys
// 注意：这是一个通配符路由，会匹配所有 GET 请求
// 需要排除被其他路由模块处理的路径

// 系统保留的路径前缀，这些路径不应该被当作图片处理
const RESERVED_PREFIXES = ['user', 'admin', 'github', 'share', 'folder', 'list', 'upload', 'rename', 'del', 'delInfo', 'delImage', 'checkToken']

function isReservedPath(id: string): boolean {
    const firstSegment = id.split('/')[0]
    return RESERVED_PREFIXES.includes(firstSegment)
}

imageRoutes.get("/:id{.+}", async (c) => {
    let id = c.req.param('id')

    // 跳过系统保留路径，让其他路由处理
    if (isReservedPath(id)) {
        // 使用 Hono 的方式跳过这个路由
        return c.text('Not Found', 404)
    }
    const range = parseRange(c.req.header('range') || null)
    const object = await c.env.PICX.get(id, {
        range,
        onlyIf: c.req.raw.headers as any,
    })
    if (object == null) {
        return c.json(Fail("object not found"))
    }

    // Check for expiration
    if (object.customMetadata && object.customMetadata.expires) {
        const expiresAt = parseInt(object.customMetadata.expires)
        if (!isNaN(expiresAt) && Date.now() > expiresAt) {
            // Expired: Delete asynchronously and return 404
            c.executionCtx.waitUntil(c.env.PICX.delete(id))
            return c.json(Fail("Image expired"), 404)
        }
    }

    // 记录访问统计（异步，不阻塞响应）
    c.executionCtx.waitUntil((async () => {
        try {
            const referer = c.req.header('referer') || null
            const userAgent = c.req.header('user-agent') || null
            // Cloudflare 提供的地理位置信息
            const cf = (c.req.raw as any).cf
            const country = cf?.country || null
            const city = cf?.city || null

            // 插入访问记录
            await c.env.DB.prepare(
                `INSERT INTO image_stats (image_key, referer, user_agent, country, city) 
                 VALUES (?, ?, ?, ?, ?)`
            ).bind(id, referer, userAgent, country, city).run()

            // 更新图片访问计数
            await c.env.DB.prepare(
                'UPDATE images SET view_count = view_count + 1 WHERE key = ?'
            ).bind(id).run()
        } catch (e) {
            console.error('Failed to record image stats:', e)
        }
    })())

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    if (range) {
        headers.set("content-range", `bytes ${range.offset}-${range.end}/${object.size}`)
    }
    const status = (object as any).body ? (range ? 206 : 200) : 304
    return new Response((object as any).body, {
        headers,
        status
    })
})

export default imageRoutes
