import { Hono } from 'hono'
import { Ok, Fail } from '../type'
import { auth, type AppEnv } from '../middleware/auth'

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

        // Verify image exists
        const imageExists = await c.env.PICX.head(data.imageKey)
        if (!imageExists) {
            return c.json(Fail('图片不存在'))
        }

        const shareId = generateShareId()
        const user = c.get('user')

        const record: ShareRecord = {
            id: shareId,
            imageKey: data.imageKey,
            imageUrl: data.imageUrl,
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
    return c.json(Ok('分享链接已删除'))
})

export default shareRoutes
