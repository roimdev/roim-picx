import { Context } from 'hono'
import { Ok, Fail, FailCode } from '../type'
import StatusCode from '../type'
import type { User, UserStats } from '../type'
import { auth, type AppEnv, loadUserPermissions } from '../middleware/auth'
import { verify } from 'hono/jwt'

/**
 * 从请求中获取用户信息（支持 Admin Token 和 JWT）
 */
async function getUserFromRequest(c: Context<AppEnv>): Promise<{ user?: User; isAdminToken: boolean }> {
    let token = c.req.header('Authorization')
    if (!token) {
        return { isAdminToken: false }
    }

    // Fix Bearer prefix if present
    if (token.startsWith('Bearer ')) {
        token = token.substring(7)
    }

    const authKey = c.env.PICX_AUTH_TOKEN
    if (!authKey) {
        return { isAdminToken: false }
    }

    // 1. Check if it's the system Admin Token
    if (token === authKey) {
        return { isAdminToken: true }
    }

    // 2. Try to verify as JWT
    try {
        const payload = await verify(token, authKey, 'HS256')
        const jwtUser = payload as unknown as User

        // 从 D1 加载用户权限
        const permissions = await loadUserPermissions(c.env.DB, jwtUser.login, c.env.ADMIN_USERS)

        // 合并用户信息和权限
        const user: User = {
            ...jwtUser,
            ...permissions
        }

        return { user, isAdminToken: false }
    } catch (e) {
        console.error(`Auth failed: ${(e as Error).message}`)
        return { isAdminToken: false }
    }
}

/**
 * 获取当前用户信息和权限
 * GET /user/me
 */
export const userMeHandler = async (c: Context<AppEnv>) => {
    const { user, isAdminToken } = await getUserFromRequest(c)

    if (isAdminToken) {
        return c.json(Ok({
            isAdmin: true,
            canViewAll: true,
            role: 'admin'
        }))
    }

    if (!user) {
        return c.json(FailCode('需要登录', StatusCode.NotAuth))
    }

    return c.json(Ok({
        id: user.id,
        login: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
        role: user.role || 'user',
        canViewAll: user.canViewAll || false,
        storageQuota: user.storageQuota,
        storageUsed: user.storageUsed,
        uploadCount: user.uploadCount
    }))
}

/**
 * 获取当前用户的统计信息
 * GET /user/me/stats
 */
export const userMeStatsHandler = async (c: Context<AppEnv>) => {
    const { user, isAdminToken } = await getUserFromRequest(c)

    if (isAdminToken) {
        // Admin token 没有具体用户统计
        return c.json(Ok(<UserStats>{
            totalImages: 0,
            totalSize: 0,
            totalViews: 0,
            recentUploads: 0
        }))
    }

    if (!user) {
        return c.json(FailCode('需要登录', StatusCode.NotAuth))
    }

    try {
        const [imageCount, totalSize, totalViews, recentUploads] = await Promise.all([
            c.env.DB.prepare(
                'SELECT COUNT(*) as count FROM images WHERE user_login = ?'
            ).bind(user.login).first<{ count: number }>(),
            c.env.DB.prepare(
                'SELECT COALESCE(SUM(size), 0) as total FROM images WHERE user_login = ?'
            ).bind(user.login).first<{ total: number }>(),
            c.env.DB.prepare(
                'SELECT COALESCE(SUM(view_count), 0) as total FROM images WHERE user_login = ?'
            ).bind(user.login).first<{ total: number }>(),
            c.env.DB.prepare(
                `SELECT COUNT(*) as count FROM images 
                 WHERE user_login = ? AND created_at >= datetime('now', '-7 days')`
            ).bind(user.login).first<{ count: number }>()
        ])

        return c.json(Ok(<UserStats>{
            totalImages: imageCount?.count || 0,
            totalSize: totalSize?.total || 0,
            totalViews: totalViews?.total || 0,
            recentUploads: recentUploads?.count || 0
        }))
    } catch (e) {
        console.error('Failed to get user stats:', e)
        return c.json(Fail(`获取统计失败: ${(e as Error).message}`))
    }
}
