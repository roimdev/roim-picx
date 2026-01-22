import { Hono } from 'hono'
import { Ok, Fail } from '../type'
import { auth, type AppEnv } from '../middleware/auth'
import { getProviderByType } from '../storage'

// Share record stored in KV
interface ShareRecord {
    id: string
    imageKey: string
    imageUrl: string
    password?: string  // MD5 hashed
    expireAt?: number
    maxViews?: number
    views: number
    createdAt: number
    createdBy?: string
}

interface CreateShareRequest {
    imageKey: string
    imageUrl: string
    password?: string
    expireAt?: number
    maxViews?: number
}

const shareRoutes = new Hono<AppEnv>()

// Simple MD5 hash for password (using SubtleCrypto)
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generate short share ID
function generateShareId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// Create share link
shareRoutes.post('/share', auth, async (c) => {
    try {
        const data = await c.req.json<CreateShareRequest>()

        if (!data.imageKey || !data.imageUrl) {
            return c.json(Fail('缺少必要参数'))
        }

        // Verify image exists in DB (multi-storage)
        const img = await c.env.DB.prepare('SELECT key, storage_type, expires_at FROM images WHERE key = ?')
            .bind(data.imageKey)
            .first<{ key: string, storage_type?: 'R2' | 'HF', expires_at?: string | null }>()

        if (!img) {
            return c.json(Fail('图片不存在'))
        }

        // Check expiration if set
        if (img.expires_at) {
            const expiresAt = new Date(img.expires_at).getTime()
            if (!isNaN(expiresAt) && Date.now() > expiresAt) {
                return c.json(Fail('图片已过期'))
            }
        }

        const provider = getProviderByType(c, img.storage_type || 'R2')
        const object = await provider.head(img.key)
        if (!object) {
            return c.json(Fail('图片不存在或已被删除'))
        }

        const shareId = generateShareId()
        const user = c.get('user')

        const record: ShareRecord = {
            id: shareId,
            imageKey: img.key,
            imageUrl: provider.getPublicUrl(img.key),
            password: data.password ? await hashPassword(data.password) : undefined,
            expireAt: data.expireAt,
            maxViews: data.maxViews,
            views: 0,
            createdAt: Date.now(),
            createdBy: user?.login
        }

        // Store in KV with optional TTL
        const kvOptions: { expirationTtl?: number } = {}
        if (data.expireAt) {
            const ttl = Math.floor((data.expireAt - Date.now()) / 1000)
            if (ttl > 0) {
                kvOptions.expirationTtl = ttl
            }
        }

        await c.env.XK.put(`share:${shareId}`, JSON.stringify(record), kvOptions)

        // 同步分享记录到 D1 数据库
        if (user) {
            c.executionCtx.waitUntil(
                c.env.DB.prepare(
                    `INSERT INTO shares (id, image_key, user_id, user_login, password_hash, max_views, current_views, expires_at) 
                     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
                ).bind(
                    shareId,
                    data.imageKey,
                    user.id,
                    user.login,
                    record.password || null,
                    data.maxViews || null,
                    data.expireAt ? new Date(data.expireAt).toISOString() : null
                ).run().then(() => {
                    // 记录分享审计日志
                    return c.env.DB.prepare(
                        `INSERT INTO audit_logs (user_id, user_login, action, target_key, details) 
                         VALUES (?, ?, 'share', ?, ?)`
                    ).bind(user.id, user.login, data.imageKey, JSON.stringify({ shareId, hasPassword: !!data.password, maxViews: data.maxViews })).run()
                }).catch(e => console.error('Failed to sync share to DB:', e))
            )
        }

        const shareUrl = `${c.env.BASE_URL}/s/${shareId}`

        return c.json(Ok({
            id: shareId,
            url: shareUrl,
            hasPassword: !!data.password,
            expireAt: data.expireAt,
            maxViews: data.maxViews
        }))
    } catch (e) {
        console.error('Create share error:', e)
        return c.json(Fail(`创建分享失败: ${(e as Error).message}`))
    }
})

// List my shares
shareRoutes.get('/share/my', auth, async (c) => {
    const user = c.get('user')
    if (!user) {
        return c.json(Fail('未登录'), 401)
    }

    try {
        // List all share keys from KV
        const shareList = await c.env.XK.list({ prefix: 'share:' })

        const myShares: any[] = []

        // Fetch each share and filter by createdBy
        for (const key of shareList.keys) {
            const recordStr = await c.env.XK.get(key.name)
            if (recordStr) {
                const record: ShareRecord = JSON.parse(recordStr)
                if (record.createdBy === user.login) {
                    // Check if expired
                    const isExpired = record.expireAt && Date.now() > record.expireAt
                    const isMaxedOut = record.maxViews && record.views >= record.maxViews

                    myShares.push({
                        id: record.id,
                        imageKey: record.imageKey,
                        imageUrl: record.imageUrl,
                        hasPassword: !!record.password,
                        expireAt: record.expireAt,
                        maxViews: record.maxViews,
                        views: record.views,
                        createdAt: record.createdAt,
                        isExpired,
                        isMaxedOut,
                        url: `${c.env.BASE_URL}/s/${record.id}`
                    })
                }
            }
        }

        // Sort by createdAt desc
        myShares.sort((a, b) => b.createdAt - a.createdAt)

        return c.json(Ok(myShares))
    } catch (e) {
        console.error('List my shares error:', e)
        return c.json(Fail(`获取分享列表失败: ${(e as Error).message}`))
    }
})

// Get share info (public, for share page)
shareRoutes.get('/share/:id', async (c) => {
    const shareId = c.req.param('id')

    const recordStr = await c.env.XK.get(`share:${shareId}`)
    if (!recordStr) {
        return c.json(Fail('分享链接不存在或已过期'), 404)
    }

    const record: ShareRecord = JSON.parse(recordStr)

    // Check expiration
    if (record.expireAt && Date.now() > record.expireAt) {
        await c.env.XK.delete(`share:${shareId}`)
        return c.json(Fail('分享链接已过期'), 410)
    }

    // Check view limit
    if (record.maxViews && record.views >= record.maxViews) {
        return c.json(Fail('分享链接已达到最大查看次数'), 410)
    }

    return c.json(Ok({
        id: record.id,
        hasPassword: !!record.password,
        expireAt: record.expireAt,
        maxViews: record.maxViews,
        views: record.views,
        createdAt: record.createdAt
    }))
})

// Verify password and get image
shareRoutes.post('/share/:id/verify', async (c) => {
    const shareId = c.req.param('id')
    const { password } = await c.req.json<{ password?: string }>()

    const recordStr = await c.env.XK.get(`share:${shareId}`)
    if (!recordStr) {
        return c.json(Fail('分享链接不存在或已过期'), 404)
    }

    const record: ShareRecord = JSON.parse(recordStr)

    // Check expiration
    if (record.expireAt && Date.now() > record.expireAt) {
        await c.env.XK.delete(`share:${shareId}`)
        return c.json(Fail('分享链接已过期'), 410)
    }

    // Check view limit
    if (record.maxViews && record.views >= record.maxViews) {
        return c.json(Fail('分享链接已达到最大查看次数'), 410)
    }

    // Verify password if required
    if (record.password) {
        if (!password) {
            return c.json(Fail('需要输入密码'), 401)
        }
        const hashedInput = await hashPassword(password)
        if (hashedInput !== record.password) {
            return c.json(Fail('密码错误'), 401)
        }
    }

    // Increment view count
    record.views += 1
    await c.env.XK.put(`share:${shareId}`, JSON.stringify(record))

    return c.json(Ok({
        imageUrl: record.imageUrl,
        imageKey: record.imageKey,
        views: record.views,
        maxViews: record.maxViews
    }))
})

// Delete share link
shareRoutes.delete('/share/:id', auth, async (c) => {
    const shareId = c.req.param('id')

    const recordStr = await c.env.XK.get(`share:${shareId}`)
    if (!recordStr) {
        return c.json(Fail('分享链接不存在'), 404)
    }

    await c.env.XK.delete(`share:${shareId}`)

    // 记录删除分享审计日志
    const user = c.get('user')
    if (user) {
        c.executionCtx.waitUntil(
            c.env.DB.prepare(
                `INSERT INTO audit_logs (user_id, user_login, action, target_key, details) 
                 VALUES (?, ?, 'delete_share', ?, ?)`
            ).bind(user.id, user.login, shareId, JSON.stringify({ shareId })).run()
                .catch(e => console.error('Failed to log delete_share:', e))
        )
    }

    return c.json(Ok('分享链接已删除'))
})

export default shareRoutes
