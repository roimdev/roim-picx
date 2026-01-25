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
    const login = `gh_${userData.login}`  // Add prefix to prevent conflicts with other providers
    const isAdmin = isAdminUser(login, adminUsers) || isAdminUser(userData.login, adminUsers)

    try {
        // 检查用户是否存在
        const existing = await db.prepare(
            'SELECT id, role, can_view_all, storage_quota, storage_used, upload_count FROM users WHERE github_id = ?'
        ).bind(userData.id).first<DbUser>()

        if (existing) {
            // 更新最后登录时间和邮箱
            await db.prepare(
                `UPDATE users SET 
                    name = ?, 
                    avatar_url = ?,
                    email = ?,
                    last_login_at = datetime('now')
                 WHERE github_id = ?`
            ).bind(
                userData.name || userData.login,
                userData.avatar_url,
                userData.email || null,
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
                `INSERT INTO users (github_id, login, name, email, avatar_url, role, can_view_all, last_login_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
            ).bind(
                userData.id,
                login,
                userData.name || userData.login,
                userData.email || null,
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
 * 用于前端判断可用的登录方式和存储平台
 */
authRoutes.get('/auth/config', async (c) => {
    // 检查可用的存储平台
    const storageProviders: Array<{ type: 'R2' | 'HF', name: string, enabled: boolean }> = []

    // R2 总是可用的（默认）
    storageProviders.push({
        type: 'R2',
        name: 'Cloudflare R2',
        enabled: true
    })

    // HF 只有配置了 token 和 repo 才可用
    if (c.env.HF_TOKEN && c.env.HF_REPO) {
        storageProviders.push({
            type: 'HF',
            name: 'Hugging Face',
            enabled: true
        })
    }

    const defaultStorage = c.env.STORAGE_TYPE || 'R2'

    return c.json(Ok({
        allowTokenLogin: c.env.ALLOW_TOKEN_LOGIN === 'true',
        githubLoginEnabled: !!c.env.GITHUB_CLIENT_ID,
        steamLoginEnabled: c.env.STEAM_LOGIN_ENABLED === 'true' && !!c.env.STEAM_API_KEY,
        googleLoginEnabled: c.env.GOOGLE_LOGIN_ENABLED === 'true' && !!c.env.GOOGLE_CLIENT_ID,
        // 存储平台配置
        storageProviders,
        defaultStorage
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

        // 获取用户邮箱（GitHub 用户信息可能不包含邮箱，需要单独获取）
        let userEmail = userData.email
        if (!userEmail) {
            try {
                const emailRes = await fetch('https://api.github.com/user/emails', {
                    headers: {
                        'Authorization': `token ${tokenData.access_token}`,
                        'User-Agent': 'ROIM-PICX'
                    }
                })
                const emails = await emailRes.json<Array<{ email: string; primary: boolean; verified: boolean }>>()
                // 优先使用已验证的主邮箱
                const primaryEmail = emails.find(e => e.primary && e.verified)
                userEmail = primaryEmail?.email || emails.find(e => e.verified)?.email || null
            } catch (e) {
                console.error('Failed to fetch GitHub emails:', e)
            }
        }
        userData.email = userEmail

        // If owner is configured and not wildcard, verify user
        if (owner && owner !== '*' && userData.login !== owner) {
            return c.json(FailCode("Unauthorized GitHub User", StatusCode.NotAuth))
        }

        // 同步用户到 D1 数据库并获取权限
        const permissions = await syncUserToDb(c.env.DB, userData, c.env.ADMIN_USERS)

        // Create JWT Payload with User Info (with gh_ prefix for login)
        const userPayload: User = {
            id: userData.id,
            name: userData.name || userData.login,
            login: `gh_${userData.login}`,
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

            // 记录登录日志
            try {
                await c.env.DB.prepare(
                    `INSERT INTO audit_logs (user_id, user_login, action, details) 
                     VALUES (?, ?, 'login', ?)`
                ).bind(
                    systemUser.id,
                    systemUser.login,
                    JSON.stringify({ type: 'token_login' })
                ).run()
            } catch (e) {
                console.error('Failed to log token login:', e)
            }

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

// ============================================
// Steam OpenID 登录
// ============================================

/**
 * Steam 登录 - 生成 OpenID 认证 URL
 */
authRoutes.get('/steam/login', async (c) => {
    if (c.env.STEAM_LOGIN_ENABLED !== 'true' || !c.env.STEAM_API_KEY) {
        return c.json(Fail('Steam login is not enabled'))
    }

    const returnUrl = `${c.env.BASE_URL}/rest/steam/callback`

    const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': returnUrl,
        'openid.realm': c.env.BASE_URL,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    })

    const steamAuthUrl = `https://steamcommunity.com/openid/login?${params.toString()}`

    return c.json(Ok({ authUrl: steamAuthUrl }))
})

/**
 * Steam 回调 - 处理 OpenID 认证结果
 */
authRoutes.get('/steam/callback', async (c) => {
    if (c.env.STEAM_LOGIN_ENABLED !== 'true' || !c.env.STEAM_API_KEY) {
        return c.redirect('/auth?error=steam_disabled')
    }

    const query = c.req.query()

    // 验证 OpenID 签名
    const validationParams = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
        validationParams.append(key, value as string)
    }
    validationParams.set('openid.mode', 'check_authentication')

    try {
        const validationRes = await fetch('https://steamcommunity.com/openid/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: validationParams.toString()
        })
        const validationText = await validationRes.text()

        if (!validationText.includes('is_valid:true')) {
            return c.redirect('/auth?error=steam_invalid')
        }

        // 从 claimed_id 提取 SteamID
        const claimedId = query['openid.claimed_id'] as string
        const steamIdMatch = claimedId?.match(/\/id\/(\d+)$/)
        if (!steamIdMatch) {
            return c.redirect('/auth?error=steam_no_id')
        }
        const steamId = steamIdMatch[1]

        // 调用 Steam API 获取用户信息
        const userRes = await fetch(
            `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${c.env.STEAM_API_KEY}&steamids=${steamId}`
        )
        const userData = await userRes.json<any>()
        const player = userData?.response?.players?.[0]

        if (!player) {
            return c.redirect('/auth?error=steam_user_not_found')
        }

        // 同步用户到 D1 数据库
        const permissions = await syncSteamUserToDb(c.env.DB, player, c.env.ADMIN_USERS)

        // 创建 JWT Payload
        const userPayload: User = {
            id: parseInt(steamId.slice(-8), 10), // 取 SteamID 后 8 位作为数字 ID
            name: player.personaname,
            login: `steam_${steamId}`,
            avatar_url: player.avatarfull || player.avatar,
            role: permissions.role,
            canViewAll: permissions.canViewAll
        }

        // 签发 JWT Token
        const token = await sign(userPayload, c.env.PICX_AUTH_TOKEN, 'HS256')

        // 重定向到前端，带上 token 参数
        return c.redirect(`/auth?steam_token=${encodeURIComponent(token)}&steam_user=${encodeURIComponent(JSON.stringify(userPayload))}`)
    } catch (e: any) {
        console.error('Steam callback error:', e)
        return c.redirect(`/auth?error=steam_error&msg=${encodeURIComponent(e.message)}`)
    }
})

/**
 * 同步 Steam 用户到 D1 数据库
 */
async function syncSteamUserToDb(db: D1Database, player: any, adminUsers?: string): Promise<Partial<User>> {
    const steamId = player.steamid
    const login = `steam_${steamId}`
    const isAdmin = isAdminUser(login, adminUsers)

    try {
        // 检查用户是否存在
        const existing = await db.prepare(
            'SELECT id, role, can_view_all, storage_quota, storage_used, upload_count FROM users WHERE steam_id = ?'
        ).bind(steamId).first<DbUser>()

        if (existing) {
            // 更新最后登录时间
            await db.prepare(
                `UPDATE users SET 
                    name = ?, 
                    avatar_url = ?, 
                    last_login_at = datetime('now')
                 WHERE steam_id = ?`
            ).bind(
                player.personaname,
                player.avatarfull || player.avatar,
                steamId
            ).run()

            // 记录登录日志
            await db.prepare(
                `INSERT INTO audit_logs (user_id, user_login, action, details) 
                 VALUES (?, ?, 'login', ?)`
            ).bind(
                existing.id,
                login,
                JSON.stringify({ type: 'steam_openid' })
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
            await db.prepare(
                `INSERT INTO users (github_id, steam_id, login, name, avatar_url, role, can_view_all, last_login_at) 
                 VALUES (0, ?, ?, ?, ?, ?, ?, datetime('now'))`
            ).bind(
                steamId,
                login,
                player.personaname,
                player.avatarfull || player.avatar,
                isAdmin ? 'admin' : 'user',
                isAdmin ? 1 : 0
            ).run()

            // 记录登录日志
            await db.prepare(
                `INSERT INTO audit_logs (user_login, action, details) 
                 VALUES (?, 'login', ?)`
            ).bind(
                login,
                JSON.stringify({ type: 'steam_openid', first_login: true })
            ).run()

            return {
                role: isAdmin ? 'admin' : 'user',
                canViewAll: isAdmin
            }
        }
    } catch (e) {
        console.error('Failed to sync Steam user to DB:', e)
        return {
            role: isAdmin ? 'admin' : 'user',
            canViewAll: isAdmin
        }
    }
}

// ============================================
// Google OAuth 2.0 登录
// ============================================

/**
 * 同步 Google 用户到 D1 数据库
 */
async function syncGoogleUserToDb(db: any, googleUser: any, adminUsers?: string): Promise<Partial<User>> {
    const login = `google_${googleUser.id}` // Use Google sub ID with prefix to prevent conflicts
    const isAdmin = isAdminUser(googleUser.email, adminUsers) || isAdminUser(login, adminUsers)

    try {
        // 检查用户是否存在
        const existing = await db.prepare(
            'SELECT id, role, can_view_all, storage_quota, storage_used, upload_count FROM users WHERE google_id = ?'
        ).bind(googleUser.id).first<DbUser>()

        if (existing) {
            // 更新最后登录时间和邮箱
            await db.prepare(
                `UPDATE users SET 
                    name = ?, 
                    avatar_url = ?,
                    email = ?,
                    last_login_at = datetime('now')
                 WHERE google_id = ?`
            ).bind(
                googleUser.name,
                googleUser.picture,
                googleUser.email,
                googleUser.id
            ).run()

            // 记录登录日志
            await db.prepare(
                `INSERT INTO audit_logs (user_id, user_login, action, details) 
                 VALUES (?, ?, 'login', ?)`
            ).bind(
                existing.id,
                login,
                JSON.stringify({ type: 'google_oauth' })
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
            await db.prepare(
                `INSERT INTO users (github_id, google_id, login, name, email, avatar_url, role, can_view_all, last_login_at) 
                 VALUES (0, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
            ).bind(
                0, // github_id
                googleUser.id,
                login,
                googleUser.name,
                googleUser.email,
                googleUser.picture,
                isAdmin ? 'admin' : 'user',
                isAdmin ? 1 : 0
            ).run()

            // 记录登录日志
            await db.prepare(
                `INSERT INTO audit_logs (user_login, action, details) 
                 VALUES (?, 'login', ?)`
            ).bind(
                login,
                JSON.stringify({ type: 'google_oauth', first_login: true })
            ).run()

            return {
                role: isAdmin ? 'admin' : 'user',
                canViewAll: isAdmin
            }
        }
    } catch (e) {
        console.error('Failed to sync Google user to DB:', e)
        return {
            role: isAdmin ? 'admin' : 'user',
            canViewAll: isAdmin
        }
    }
}

/**
 * Google 登录 - 重定向到 Google OAuth
 */
authRoutes.get('/google/login', async (c) => {
    if (c.env.GOOGLE_LOGIN_ENABLED !== 'true' || !c.env.GOOGLE_CLIENT_ID) {
        return c.json(Fail('Google login is not enabled'))
    }

    const redirectUri = `${c.env.BASE_URL}/rest/google/callback`
    const state = crypto.randomUUID()

    // Store state for CSRF protection
    await c.env.XK.put(`google_state:${state}`, '1', { expirationTtl: 600 })

    const params = new URLSearchParams({
        client_id: c.env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state: state,
        access_type: 'online',
        prompt: 'select_account'
    })

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    return c.redirect(googleAuthUrl)
})

/**
 * Google OAuth 回调
 */
authRoutes.get('/google/callback', async (c) => {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const error = c.req.query('error')

    const frontendUrl = c.env.BASE_URL

    if (error) {
        return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
        return c.redirect(`${frontendUrl}/auth?error=missing_params`)
    }

    // Verify state
    const storedState = await c.env.XK.get(`google_state:${state}`)
    if (!storedState) {
        return c.redirect(`${frontendUrl}/auth?error=invalid_state`)
    }
    await c.env.XK.delete(`google_state:${state}`)

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: c.env.GOOGLE_CLIENT_ID!,
                client_secret: c.env.GOOGLE_CLIENT_SECRET!,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: `${c.env.BASE_URL}/rest/google/callback`
            })
        })

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text()
            console.error('Google token error:', errorData)
            return c.redirect(`${frontendUrl}/auth?error=token_exchange_failed`)
        }

        const tokenData = await tokenResponse.json<{ access_token: string; id_token: string }>()

        // Get user info
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        })

        if (!userResponse.ok) {
            return c.redirect(`${frontendUrl}/auth?error=userinfo_failed`)
        }

        const googleUser = await userResponse.json<{
            id: string
            email: string
            verified_email: boolean
            name: string
            given_name: string
            family_name: string
            picture: string
        }>()

        // Sync user to database
        const dbUserData = await syncGoogleUserToDb(c.env.DB, googleUser, c.env.ADMIN_USERS)

        // Create JWT token
        const login = `google_${googleUser.id}`
        const user: User = {
            id: parseInt(googleUser.id.substring(0, 10)) || Date.now(),
            login: login,
            name: googleUser.name,
            avatar_url: googleUser.picture,
            role: dbUserData.role || 'user',
            canViewAll: dbUserData.canViewAll || false,
            storageQuota: dbUserData.storageQuota,
            storageUsed: dbUserData.storageUsed,
            uploadCount: dbUserData.uploadCount
        }

        const jwtPayload = {
            ...user,
            exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
        }

        const token = await sign(jwtPayload, c.env.PICX_AUTH_TOKEN)

        // Redirect to frontend with token
        const authToken = {
            token,
            user
        }

        return c.redirect(
            `${frontendUrl}/auth?google_token=${encodeURIComponent(token)}&google_user=${encodeURIComponent(JSON.stringify(user))}`
        )
    } catch (e) {
        console.error('Google OAuth error:', e)
        return c.redirect(`${frontendUrl}/auth?error=${encodeURIComponent((e as Error).message)}`)
    }
})

export default authRoutes
