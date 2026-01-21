import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { Ok, Fail, FailCode } from '../type'
import StatusCode from '../type'
import type { AuthToken, User, DbUser } from '../type'
import type { AppEnv } from '../middleware/auth'
import { isAdminUser, getOrCreateSystemUser } from '../middleware/auth'

const authRoutes = new Hono<AppEnv>()

/**
 * 同步用户到 D1 数据库
 */
async function syncUserToDb(db: D1Database, userData: any, adminUsers?: string): Promise<Partial<User>> {
    const isAdmin = isAdminUser(userData.login, adminUsers)

    try {
        // 检查用户是否存在
        const existing = await db.prepare(
            'SELECT id, role, can_view_all, storage_quota, storage_used, upload_count FROM users WHERE github_id = ?'
        ).bind(userData.id).first<DbUser>()

        if (existing) {
            // 更新最后登录时间
            await db.prepare(
                `UPDATE users SET 
                    name = ?, 
                    avatar_url = ?, 
                    last_login_at = datetime('now')
                 WHERE github_id = ?`
            ).bind(
                userData.name || userData.login,
                userData.avatar_url,
                userData.id
            ).run()

            // 记录登录日志
            await db.prepare(
                `INSERT INTO audit_logs (user_id, user_login, action, details) 
                 VALUES (?, ?, 'login', ?)`
            ).bind(
                existing.id,
                userData.login,
                JSON.stringify({ type: 'github_oauth' })
            ).run()

            return {
                role: existing.role,
                canViewAll: existing.can_view_all === 1,
                storageQuota: existing.storage_quota,
                storageUsed: existing.storage_used,
                uploadCount: existing.upload_count
            }
        } else {
            // 创建新用户
            const result = await db.prepare(
                `INSERT INTO users (github_id, login, name, avatar_url, role, can_view_all, last_login_at) 
                 VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
            ).bind(
                userData.id,
                userData.login,
                userData.name || userData.login,
                userData.avatar_url,
                isAdmin ? 'admin' : 'user',
                isAdmin ? 1 : 0
            ).run()

            // 记录登录日志
            await db.prepare(
                `INSERT INTO audit_logs (user_login, action, details) 
                 VALUES (?, 'login', ?)`
            ).bind(
                userData.login,
                JSON.stringify({ type: 'github_oauth', first_login: true })
            ).run()

            return {
                role: isAdmin ? 'admin' : 'user',
                canViewAll: isAdmin
            }
        }
    } catch (e) {
        console.error('Failed to sync user to DB:', e)
        // 即使数据库操作失败，也返回基本权限
        return {
            role: isAdmin ? 'admin' : 'user',
            canViewAll: isAdmin
        }
    }
}

/**
 * 获取认证配置
 * 用于前端判断可用的登录方式
 */
authRoutes.get('/auth/config', async (c) => {
    return c.json(Ok({
        allowTokenLogin: c.env.ALLOW_TOKEN_LOGIN === 'true',
        githubLoginEnabled: !!c.env.GITHUB_CLIENT_ID
    }))
})

// GitHub Login
authRoutes.post('/github/login', async (c) => {
    const { code } = await c.req.json<{ code: string }>()
    if (!code) return c.json(Fail("Missing code"))

    const clientId = c.env.GITHUB_CLIENT_ID
    const clientSecret = c.env.GITHUB_CLIENT_SECRET
    const owner = c.env.GITHUB_OWNER
    const authKey = c.env.PICX_AUTH_TOKEN

    if (!clientId || !clientSecret || !authKey) {
        return c.json(Fail("GitHub auth or System Token not configured"))
    }

    try {
        // Exchange code for token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code
            })
        })
        const tokenData = await tokenRes.json<any>()
        if (tokenData.error) return c.json(Fail(tokenData.error_description))

        // Get User Info
        const userRes = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${tokenData.access_token}`,
                'User-Agent': 'ROIM-PICX'
            }
        })
        const userData = await userRes.json<any>()

        // If owner is configured and not wildcard, verify user
        if (owner && owner !== '*' && userData.login !== owner) {
            return c.json(FailCode("Unauthorized GitHub User", StatusCode.NotAuth))
        }

        // 同步用户到 D1 数据库并获取权限
        const permissions = await syncUserToDb(c.env.DB, userData, c.env.ADMIN_USERS)

        // Create JWT Payload with User Info
        const userPayload: User = {
            id: userData.id,
            name: userData.name || userData.login,
            login: userData.login,
            avatar_url: userData.avatar_url,
            role: permissions.role,
            canViewAll: permissions.canViewAll
        }

        // Sign Token using System Auth Token as secret
        const token = await sign(userPayload, authKey, 'HS256')

        return c.json(Ok({
            token,
            user: userPayload
        }))
    } catch (e: any) {
        return c.json(Fail(e.message))
    }
})

// 检测token是否有效（也用于 Token 登录）
authRoutes.post('/checkToken', async (c) => {
    const data = await c.req.json<AuthToken>()
    let token = data.token
    if (!token) {
        return c.json(Ok(false))
    }

    if (token.startsWith('Bearer ')) {
        token = token.substring(7)
    }

    const authKey = c.env.PICX_AUTH_TOKEN
    if (!authKey) {
        return c.json(Ok(false))
    }

    // 1. Check Static Token - 使用系统用户登录
    if (authKey === token) {
        // 检查是否允许 Token 登录
        if (c.env.ALLOW_TOKEN_LOGIN !== 'true') {
            return c.json(FailCode('Token login is disabled', StatusCode.NotAuth))
        }

        try {
            // 获取或创建系统用户
            const systemUser = await getOrCreateSystemUser(c.env.DB)

            // 创建用户 payload
            const userPayload: User = {
                id: systemUser.id,
                name: systemUser.name,
                login: systemUser.login,
                avatar_url: systemUser.avatar_url,
                role: systemUser.role,
                canViewAll: systemUser.canViewAll
            }

            // 签发 JWT Token（使用系统 Token 作为密钥）
            const jwtToken = await sign(userPayload as any, authKey, 'HS256')

            // 返回 token 和用户信息（与 GitHub 登录格式一致）
            return c.json(Ok({
                token: jwtToken,
                user: userPayload
            }))
        } catch (e) {
            console.error('Token login failed:', e)
            return c.json(Fail('Token login failed'))
        }
    }

    // 2. Check JWT - 已登录用户验证
    try {
        const payload = await verify(token, authKey, 'HS256')
        // JWT 有效，返回 true（前端已有 token）
        return c.json(Ok(true))
    } catch (e) {
        return c.json(Ok(false))
    }
})

export default authRoutes
