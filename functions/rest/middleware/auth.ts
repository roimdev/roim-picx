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
 * Auth middleware for non-GET/OPTIONS requests
 * Validates Admin Token or JWT Token
 */
export const auth = async (c: Context<AppEnv>, next: Next) => {
    const method = c.req.method
    if (method === "GET" || method === "OPTIONS" || c.req.path.startsWith('/rest/github/login')) {
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
        // Admin access - 标记为管理员 Token 访问
        c.set('isAdminToken', true)
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
        // Both checks failed
        console.error(`Auth failed: ${(e as Error).message}`)
        return c.json(FailCode(`auth fail: ${(e as Error).message}`, StatusCode.NotAuth))
    }
}
