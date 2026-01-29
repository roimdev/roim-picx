import { Hono } from 'hono'
import { Ok, Fail, type DbShare } from '../type'
import { auth, type AppEnv } from '../middleware/auth'
import { getProviderByType } from '../storage'

// Sync the response format with previous KV implementation for compatibility
interface ShareResponse {
    id: string
    imageKey: string
    imageUrl: string
    hasPassword: boolean
    expireAt?: number
    maxViews?: number
    views: number
    createdAt: number
    isExpired: boolean
    isMaxedOut: boolean
    url: string
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
        const passwordHash = data.password ? await hashPassword(data.password) : null

        // Store in D1
        await c.env.DB.prepare(
            `INSERT INTO shares (id, image_key, user_id, user_login, password_hash, max_views, current_views, expires_at, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
        ).bind(
            shareId,
            data.imageKey,
            user?.id || null,
            user?.login || null,
            passwordHash,
            data.maxViews || null,
            data.expireAt ? new Date(data.expireAt).toISOString() : null,
            new Date().toISOString()
        ).run()

        // 记录分享审计日志
        if (user) {
            c.executionCtx.waitUntil(
                c.env.DB.prepare(
                    `INSERT INTO audit_logs (user_id, user_login, action, target_key, details) 
                     VALUES (?, ?, 'share', ?, ?)`
                ).bind(user.id, user.login, data.imageKey, JSON.stringify({ shareId, hasPassword: !!data.password, maxViews: data.maxViews })).run()
                    .catch(e => console.error('Failed to log share audit:', e))
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
        const results = await c.env.DB.prepare(
            'SELECT * FROM shares WHERE user_login = ? ORDER BY created_at DESC'
        ).bind(user.login).all<DbShare>()

        const myShares = await Promise.all((results.results || []).map(async (record) => {
            // Get image info to generate public URL
            // Optimization: could join, but following original logic for now
            const img = await c.env.DB.prepare('SELECT storage_type FROM images WHERE key = ?')
                .bind(record.image_key).first<{ storage_type?: 'R2' | 'HF' }>()

            const provider = getProviderByType(c, img?.storage_type || 'R2')
            const createdAt = new Date(record.created_at).getTime()
            const expireAt = record.expires_at ? new Date(record.expires_at).getTime() : undefined

            const isExpired = !!expireAt && Date.now() > expireAt
            const isMaxedOut = !!record.max_views && record.current_views >= record.max_views

            return <ShareResponse>{
                id: record.id,
                imageKey: record.image_key,
                imageUrl: provider.getPublicUrl(record.image_key),
                hasPassword: !!record.password_hash,
                expireAt: expireAt,
                maxViews: record.max_views || undefined,
                views: record.current_views,
                createdAt: createdAt,
                isExpired,
                isMaxedOut,
                url: `${c.env.BASE_URL}/s/${record.id}`
            }
        }))

        return c.json(Ok(myShares))
    } catch (e) {
        console.error('List my shares error:', e)
        return c.json(Fail(`获取分享列表失败: ${(e as Error).message}`))
    }
})

// Get share info (public, for share page)
shareRoutes.get('/share/:id', async (c) => {
    const shareId = c.req.param('id')

    const record = await c.env.DB.prepare(
        'SELECT * FROM shares WHERE id = ?'
    ).bind(shareId).first<DbShare>()

    if (!record) {
        return c.json(Fail('分享链接不存在或已过期'), 404)
    }

    const expireAt = record.expires_at ? new Date(record.expires_at).getTime() : undefined

    // Check expiration
    if (expireAt && Date.now() > expireAt) {
        await c.env.DB.prepare('DELETE FROM shares WHERE id = ?').bind(shareId).run()
        return c.json(Fail('分享链接已过期'), 200)
    }

    // Check view limit
    if (record.max_views && record.current_views >= record.max_views) {
        return c.json(Fail('分享链接已达到最大查看次数'), 200)
    }

    return c.json(Ok({
        id: record.id,
        hasPassword: !!record.password_hash,
        expireAt: expireAt,
        maxViews: record.max_views,
        views: record.current_views,
        createdAt: new Date(record.created_at).getTime()
    }))
})

// Verify password and get image
shareRoutes.post('/share/:id/verify', async (c) => {
    const shareId = c.req.param('id')
    const { password } = await c.req.json<{ password?: string }>()

    const record = await c.env.DB.prepare(
        'SELECT * FROM shares WHERE id = ?'
    ).bind(shareId).first<DbShare>()

    if (!record) {
        return c.json(Fail('分享链接不存在或已过期'), 404)
    }

    const expireAt = record.expires_at ? new Date(record.expires_at).getTime() : undefined

    // Check expiration
    if (expireAt && Date.now() > expireAt) {
        await c.env.DB.prepare('DELETE FROM shares WHERE id = ?').bind(shareId).run()
        return c.json(Fail('分享链接已过期'), 200)
    }

    // Check view limit
    if (record.max_views && record.current_views >= record.max_views) {
        return c.json(Fail('分享链接已达到最大查看次数'), 200)
    }

    // Verify password if required
    if (record.password_hash) {
        if (!password) {
            return c.json(Fail('需要输入密码'), 200)
        }
        const hashedInput = await hashPassword(password)
        if (hashedInput !== record.password_hash) {
            return c.json(Fail('密码错误'), 200)
        }
    }

    // Increment view count in D1
    await c.env.DB.prepare(
        'UPDATE shares SET current_views = current_views + 1 WHERE id = ?'
    ).bind(shareId).run()

    // Get image storage type for URL
    const img = await c.env.DB.prepare('SELECT storage_type FROM images WHERE key = ?')
        .bind(record.image_key).first<{ storage_type?: 'R2' | 'HF' }>()
    const provider = getProviderByType(c, img?.storage_type || 'R2')

    return c.json(Ok({
        imageUrl: provider.getPublicUrl(record.image_key),
        imageKey: record.image_key,
        views: record.current_views + 1,
        maxViews: record.max_views
    }))
})

// Delete share link
shareRoutes.delete('/share/:id', auth, async (c) => {
    const shareId = c.req.param('id')

    const result = await c.env.DB.prepare(
        'DELETE FROM shares WHERE id = ?'
    ).bind(shareId).run()

    if (result.meta.changes === 0) {
        return c.json(Fail('分享链接不存在'), 200)
    }

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
