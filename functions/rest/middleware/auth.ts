import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import type { KVNamespace, R2Bucket, D1Database } from '@cloudflare/workers-types'
import { FailCode, NotAuth, Fail } from '../type'
import StatusCode from '../type'
import type { User, DbUser } from '../type'

export type Bindings = {
    BASE_URL: string
    XK: KVNamespace
    PICX: R2Bucket
    DB: D1Database  // D1 数据库
    PICX_AUTH_TOKEN: string
    GITHUB_CLIENT_ID: string
    GITHUB_CLIENT_SECRET: string
    GITHUB_OWNER: string
    ADMIN_USERS?: string  // 超级管理员 GitHub 用户名列表，逗号分隔
    ALLOW_TOKEN_LOGIN?: string  // 是否允许 Token 登录，设置为 'true' 启用
}

export type Variables = {
    user?: User
    isAdminToken?: boolean  // 是否使用管理员 Token 登录
}

export type AppEnv = { Bindings: Bindings; Variables: Variables }

/**
 * 检查用户是否是超级管理员
 */
export function isAdminUser(login: string, adminUsers?: string): boolean {
    if (!adminUsers) return false
    const admins = adminUsers.split(',').map(s => s.trim().toLowerCase())
    return admins.includes(login.toLowerCase())
}

/**
 * 从 D1 加载用户权限信息
 */
export async function loadUserPermissions(db: D1Database, login: string, adminUsers?: string): Promise<Partial<User>> {
    try {
        const result = await db.prepare(
            'SELECT role, can_view_all, storage_quota, storage_used, upload_count FROM users WHERE login = ?'
        ).bind(login).first() as DbUser | null

        if (result) {
            return {
                role: result.role,
                canViewAll: result.can_view_all === 1,
                storageQuota: result.storage_quota,
                storageUsed: result.storage_used,
                uploadCount: result.upload_count
            }
        }
    } catch (e) {
        console.error('Failed to load user permissions:', e)
    }

    // 如果用户在 ADMIN_USERS 列表中，设置为管理员
    if (isAdminUser(login, adminUsers)) {
        return { role: 'admin', canViewAll: true }
    }

    return { role: 'user', canViewAll: false }
}

/**
 * 系统用户的固定 GitHub ID
 */
const SYSTEM_USER_GITHUB_ID = 0

/**
 * 获取或创建系统默认用户
 * 用于 Token 登录时关联上传数据
 */
export async function getOrCreateSystemUser(db: D1Database): Promise<User> {
    try {
        // 尝试获取系统用户
        const existing = await db.prepare(
            'SELECT id, login, name, avatar_url, role, can_view_all, storage_quota, storage_used, upload_count FROM users WHERE github_id = ?'
        ).bind(SYSTEM_USER_GITHUB_ID).first() as DbUser | null

        if (existing) {
            return {
                id: existing.id,
                login: existing.login,
                name: existing.name || 'System Admin',
                avatar_url: existing.avatar_url || '',
                role: existing.role,
                canViewAll: existing.can_view_all === 1,
                storageQuota: existing.storage_quota,
                storageUsed: existing.storage_used,
                uploadCount: existing.upload_count
            }
        }

        // 创建系统用户
        await db.prepare(
            `INSERT INTO users (github_id, login, name, avatar_url, role, can_view_all, storage_quota) 
             VALUES (?, 'system', 'System Admin', NULL, 'admin', 1, 0)`
        ).bind(SYSTEM_USER_GITHUB_ID).run()

        // 重新获取创建的用户（获取自增 ID）
        const created = await db.prepare(
            'SELECT id, login, name, avatar_url, role, can_view_all, storage_quota, storage_used, upload_count FROM users WHERE github_id = ?'
        ).bind(SYSTEM_USER_GITHUB_ID).first() as DbUser | null

        if (created) {
            return {
                id: created.id,
                login: created.login,
                name: created.name || 'System Admin',
                avatar_url: created.avatar_url || '',
                role: created.role,
                canViewAll: created.can_view_all === 1,
                storageQuota: created.storage_quota,
                storageUsed: created.storage_used,
                uploadCount: created.upload_count
            }
        }
    } catch (e) {
        console.error('Failed to get or create system user:', e)
    }

    // 返回默认系统用户（无数据库 ID）
    return {
        id: 0,
        login: 'system',
        name: 'System Admin',
        avatar_url: '',
        role: 'admin',
        canViewAll: true
    }
}

/**
 * Auth middleware for all requests
 * Validates Admin Token or JWT Token
 * Only OPTIONS requests (CORS preflight) and login routes are excluded
 */
export const auth = async (c: Context<AppEnv>, next: Next) => {
    const method = c.req.method

    // OPTIONS 请求直接放行（CORS 预检）
    if (method === "OPTIONS") {
        await next()
        return
    }

    // 跳过登录相关路由和配置接口
    if (c.req.path.startsWith('/rest/github/login') || c.req.path === '/rest/auth/config') {
        await next()
        return
    }

    // get user token
    let token = c.req.header('Authorization')
    if (!token) {
        return c.json(NotAuth())
    }

    // Fix Bearer prefix if present
    if (token.startsWith('Bearer ')) {
        token = token.substring(7)
    }

    const authKey = c.env.PICX_AUTH_TOKEN
    if (!authKey) {
        return c.json(Fail("system not auth setting"))
    }

    // 1. Check if it's the system Admin Token
    if (token === authKey) {
        // 检查是否允许 Token 登录
        if (c.env.ALLOW_TOKEN_LOGIN !== 'true') {
            return c.json(FailCode('Token login is disabled', StatusCode.NotAuth))
        }

        // Admin access - 加载或创建系统用户
        c.set('isAdminToken', true)

        // 尝试加载系统用户
        try {
            const systemUser = await getOrCreateSystemUser(c.env.DB)
            c.set('user', systemUser)
        } catch (e) {
            console.error('Failed to load system user:', e)
            // 即使加载失败也允许继续，但没有用户上下文
        }

        await next()
        return
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

        c.set('user', user)
        c.set('isAdminToken', false)
        await next()
    } catch (e) {
        // JWT 验证失败
        console.error(`Auth failed: ${(e as Error).message}`)
        return c.json(FailCode(`auth fail: ${(e as Error).message}`, StatusCode.NotAuth))
    }
}
