import { Hono } from 'hono'
import { Ok, Fail } from '../type'
import { auth, type AppEnv } from '../middleware/auth'

const albumRoutes = new Hono<AppEnv>()

// Helper for generic SQL results
interface DbAlbum {
    id: number
    user_id: number
    name: string
    description: string | null
    cover_image: string | null
    created_at: number
    updated_at: number
}

// === Management Endpoints ===

// List albums
albumRoutes.get('/albums', auth, async (c) => {
    const user = c.get('user')
    if (!user) return c.json(Fail('未登录'), 401)

    const keyword = c.req.query('keyword')

    try {
        let sql = 'SELECT * FROM albums WHERE user_id = ?'
        const binds: any[] = [user.id]

        if (keyword) {
            sql += ' AND (name LIKE ? OR description LIKE ?)'
            binds.push(`%${keyword}%`, `%${keyword}%`)
        }

        sql += ' ORDER BY created_at DESC'

        const result = await c.env.DB.prepare(sql).bind(...binds).all<DbAlbum>()

        // Get image count for each album
        const albums = await Promise.all((result.results || []).map(async (album) => {
            const countRes = await c.env.DB.prepare(
                'SELECT COUNT(*) as count FROM album_images WHERE album_id = ?'
            ).bind(album.id).first<{ count: number }>()

            // Get share info
            const shareRes = await c.env.DB.prepare(
                'SELECT * FROM album_shares WHERE album_id = ? LIMIT 1'
            ).bind(album.id).first<any>()

            let share = undefined
            if (shareRes) {
                share = {
                    id: shareRes.id,
                    url: `${new URL(c.req.url).origin}/s/album/${shareRes.id}`,
                    hasPassword: !!shareRes.password_hash,
                    expireAt: shareRes.expires_at ? new Date(shareRes.expires_at).getTime() : undefined,
                    maxViews: shareRes.max_views,
                    views: shareRes.current_views,
                    createdAt: shareRes.created_at
                }
            }

            return {
                ...album,
                imageCount: countRes?.count || 0,
                shareInfo: { ...share }
            }
        }))

        return c.json(Ok(albums))
    } catch (e) {
        console.error('List albums error:', e)
        return c.json(Fail('获取相册列表失败'))
    }
})

// Create album
albumRoutes.post('/albums', auth, async (c) => {
    const user = c.get('user')
    if (!user) return c.json(Fail('未登录'), 401)

    const { name, description, coverImage } = await c.req.json<{
        name: string, description?: string, coverImage?: string
    }>()

    if (!name) return c.json(Fail('相册名称不能为空'))

    const now = Date.now()
    try {
        const result = await c.env.DB.prepare(
            `INSERT INTO albums (user_id, name, description, cover_image, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(user.id, name, description || null, coverImage || null, now, now).run()

        return c.json(Ok({
            id: result.meta.last_row_id,
            name,
            description,
            coverImage,
            createdAt: now,
            updatedAt: now,
            imageCount: 0
        }))
    } catch (e) {
        console.error('Create album error:', e)
        return c.json(Fail('创建相册失败'))
    }
})

// Update album
albumRoutes.put('/albums/:id', auth, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const { name, description, coverImage } = await c.req.json()

    try {
        // Check ownership
        const album = await c.env.DB.prepare('SELECT id FROM albums WHERE id = ? AND user_id = ?')
            .bind(id, user!.id).first()
        if (!album) return c.json(Fail('相册不存在或无权限'))

        const now = Date.now()
        await c.env.DB.prepare(
            `UPDATE albums SET name = ?, description = ?, cover_image = ?, updated_at = ? WHERE id = ?`
        ).bind(name, description || null, coverImage || null, now, id).run()

        return c.json(Ok({ id, name, description, coverImage, updatedAt: now }))
    } catch (e) {
        return c.json(Fail('更新相册失败'))
    }
})

// Delete album
albumRoutes.delete('/albums/:id', auth, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')

    try {
        const result = await c.env.DB.prepare('DELETE FROM albums WHERE id = ? AND user_id = ?')
            .bind(id, user!.id).run()

        if (result.meta.changes === 0) return c.json(Fail('相册不存在或无权限'))

        return c.json(Ok('删除成功'))
    } catch (e) {
        console.error('Delete album error:', e)
        return c.json(Fail('删除相册失败'))
    }
})

// Get album details and images
albumRoutes.get('/albums/:id', auth, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = (page - 1) * limit

    try {
        const album = await c.env.DB.prepare('SELECT * FROM albums WHERE id = ? AND user_id = ?')
            .bind(id, user!.id).first<DbAlbum>()

        if (!album) return c.json(Fail('相册不存在或无权限'), 404)

        const [images, countResult] = await Promise.all([
            c.env.DB.prepare(
                'SELECT * FROM album_images WHERE album_id = ? ORDER BY added_at DESC LIMIT ? OFFSET ?'
            ).bind(id, limit, offset).all(),
            c.env.DB.prepare(
                'SELECT COUNT(*) as count FROM album_images WHERE album_id = ?'
            ).bind(id).first<{ count: number }>()
        ])

        return c.json(Ok({
            album,
            images: images.results || [],
            total: countResult?.count || 0
        }))
    } catch (e) {
        console.error('Get album detail error:', e)
        return c.json(Fail('获取相册详情失败'))
    }
})

// Add images to album
albumRoutes.post('/albums/:id/add', auth, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const { images } = await c.req.json<{ images: { key: string, url: string }[] }>()

    if (!images || images.length === 0) return c.json(Fail('未选择图片'))

    try {
        const album = await c.env.DB.prepare('SELECT id FROM albums WHERE id = ? AND user_id = ?')
            .bind(id, user!.id).first()
        if (!album) return c.json(Fail('相册不存在或无权限'))

        const now = Date.now()
        const stmt = c.env.DB.prepare(
            'INSERT OR IGNORE INTO album_images (album_id, image_key, image_url, added_at) VALUES (?, ?, ?, ?)'
        )
        const batch = images.map(img => stmt.bind(id, img.key, img.url, now))

        await c.env.DB.batch(batch)

        // Update album updated_at
        await c.env.DB.prepare('UPDATE albums SET updated_at = ? WHERE id = ?').bind(now, id).run()

        return c.json(Ok('添加成功'))
    } catch (e) {
        console.error('Add images error:', e)
        return c.json(Fail('添加图片失败'))
    }
})

// Remove images from album
albumRoutes.post('/albums/:id/remove', auth, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const { keys } = await c.req.json<{ keys: string[] }>()

    if (!keys || keys.length === 0) return c.json(Fail('未选择图片'))

    try {
        const album = await c.env.DB.prepare('SELECT id FROM albums WHERE id = ? AND user_id = ?')
            .bind(id, user!.id).first()
        if (!album) return c.json(Fail('相册不存在或无权限'))

        // Construct generic placeholder (?, ?, ...)
        const placeholders = keys.map(() => '?').join(',')
        await c.env.DB.prepare(
            `DELETE FROM album_images WHERE album_id = ? AND image_key IN (${placeholders})`
        ).bind(id, ...keys).run()

        return c.json(Ok('移除成功'))
    } catch (e) {
        console.error('Remove images error:', e)
        return c.json(Fail('移除图片失败'))
    }
})

// Set cover
albumRoutes.post('/albums/:id/cover', auth, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const { coverImage } = await c.req.json<{ coverImage: string }>()

    if (!coverImage) return c.json(Fail('图片URL不能为空'))

    try {
        const result = await c.env.DB.prepare(
            'UPDATE albums SET cover_image = ?, updated_at = ? WHERE id = ? AND user_id = ?'
        ).bind(coverImage, Date.now(), id, user!.id).run()

        if (result.meta.changes === 0) return c.json(Fail('相册不存在或无权限'))

        return c.json(Ok('设置封面成功'))
    } catch (e) {
        return c.json(Fail('设置封面失败'))
    }
})

// === Sharing Logic ===

async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateShareId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// Share album
albumRoutes.post('/albums/:id/share', auth, async (c) => {
    const user = c.get('user')
    const id = c.req.param('id')
    const { password, expireAt, maxViews } = await c.req.json<{
        password?: string, expireAt?: number, maxViews?: number
    }>()

    try {
        // Verify album exists
        const album = await c.env.DB.prepare('SELECT id FROM albums WHERE id = ? AND user_id = ?')
            .bind(id, user!.id).first()
        if (!album) return c.json(Fail('相册不存在'))

        // Check for existing share
        const existingShare = await c.env.DB.prepare('SELECT id FROM album_shares WHERE album_id = ?').bind(id).first<{ id: string }>()

        let shareId = existingShare?.id
        const now = Date.now()
        const passwordHash = password ? await hashPassword(password) : null

        if (existingShare) {
            // Update existing
            let sql = 'UPDATE album_shares SET max_views = ?, expires_at = ?'
            const binds: any[] = [maxViews || null, expireAt ? new Date(expireAt).toISOString() : null]

            // Only update password if strictly null (remove) or provided (change). 
            // If undefined, we MIGHT want to keep it? But standardized API usually means "full replacement" of state.
            // Given "Edit" dialog behavior, let's treat it as full update.
            sql += ', password_hash = ?'
            binds.push(passwordHash) // null removes it, hash updates it.

            sql += ' WHERE id = ?'
            binds.push(existingShare.id)

            await c.env.DB.prepare(sql).bind(...binds).run()
        } else {
            // Create new
            shareId = generateShareId()
            await c.env.DB.prepare(
                `INSERT INTO album_shares (id, album_id, user_id, user_login, password_hash, max_views, expires_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                shareId, id, user!.id, user!.login,
                passwordHash, maxViews || null,
                expireAt ? new Date(expireAt).toISOString() : null,
                now
            ).run()
        }

        const shareUrl = `${c.env.BASE_URL}/s/album/${shareId}`

        // Audit log
        c.executionCtx.waitUntil(
            c.env.DB.prepare(
                `INSERT INTO audit_logs (user_id, user_login, action, details) VALUES (?, ?, 'share_album', ?)`
            ).bind(user!.id, user!.login, JSON.stringify({ albumId: id, shareId, action: existingShare ? 'update' : 'create' })).run()
        )

        return c.json(Ok({
            id: shareId,
            url: shareUrl,
            hasPassword: !!passwordHash, // Return based on what we just set
            expireAt,
            maxViews
        }))

    } catch (e) {
        console.error('Share album error:', e)
        return c.json(Fail('创建分享失败'))
    }
})

// Public: Get share info (metadata only)
albumRoutes.get('/share/album/:token', async (c) => {
    const token = c.req.param('token')

    try {
        const share = await c.env.DB.prepare(
            `SELECT s.*, a.name as album_name, a.cover_image as album_cover, a.description as album_description 
             FROM album_shares s
             JOIN albums a ON s.album_id = a.id
             WHERE s.id = ?`
        ).bind(token).first<any>()

        if (!share) return c.json(Fail('分享不存在'), 404)

        // Check expiry
        if (share.expires_at) {
            const expireTime = new Date(share.expires_at).getTime()
            if (Date.now() > expireTime) return c.json(Fail('分享已过期'), 200)
        }
        // Check views
        if (share.max_views && share.current_views >= share.max_views) {
            return c.json(Fail('分享已达到最大访问次数'), 200)
        }

        return c.json(Ok({
            id: share.id,
            albumName: share.album_name,
            description: share.album_description,
            coverImage: share.album_cover,
            hasPassword: !!share.password_hash,
            ownerName: share.user_login, // Or use a display name if available?
            createdAt: share.created_at
        }))
    } catch (e) {
        return c.json(Fail('获取分享信息失败'))
    }
})

// Public: Verify and Get Content
albumRoutes.post('/share/album/:token/verify', async (c) => {
    const token = c.req.param('token')
    const { password } = await c.req.json<{ password?: string }>()

    try {
        const share = await c.env.DB.prepare(
            'SELECT * FROM album_shares WHERE id = ?'
        ).bind(token).first<any>()

        if (!share) return c.json(Fail('分享不存在'), 404)

        // Check validations again
        if (share.expires_at && Date.now() > new Date(share.expires_at).getTime()) {
            return c.json(Fail('分享已过期'), 200)
        }
        if (share.max_views && share.current_views >= share.max_views) {
            return c.json(Fail('分享访问次数已达上限'), 200)
        }

        // Verify password
        if (share.password_hash) {
            if (!password) return c.json(Fail('请输入密码'), 200)
            const inputHash = await hashPassword(password)
            if (inputHash !== share.password_hash) return c.json(Fail('密码错误'), 200)
        }

        // Increment views
        await c.env.DB.prepare(
            'UPDATE album_shares SET current_views = current_views + 1 WHERE id = ?'
        ).bind(token).run()

        // Get images
        // Only return image URLs.
        const images = await c.env.DB.prepare(
            'SELECT image_key, album_id, image_url, added_at FROM album_images WHERE album_id = ? ORDER BY added_at DESC'
        ).bind(share.album_id).all()

        return c.json(Ok({
            images: images.results
        }))
    } catch (e) {
        console.error('Verify album share error:', e)
        return c.json(Fail('验证失败'))
    }
})

export default albumRoutes
