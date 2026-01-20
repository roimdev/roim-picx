import { Hono } from 'hono'
import { Ok, Fail, FailCode } from '../type'
import StatusCode from '../type'
import type { User, DbUser, UserStats } from '../type'
import { auth, type AppEnv, isAdminUser } from '../middleware/auth'

const adminRoutes = new Hono<AppEnv>()

/**
 * 管理员权限中间件
 */
const adminAuth = async (c: any, next: any) => {
    const user = c.get('user') as User | undefined
    const isAdminToken = c.get('isAdminToken') || false
    
    // 使用管理员 Token 直接通过
    if (isAdminToken) {
        await next()
        return
    }
    
    // 检查用户角色
    if (!user) {
        return c.json(FailCode('需要登录', StatusCode.NotAuth))
    }
    
    // 检查是否是管理员
    const isAdmin = user.role === 'admin' || isAdminUser(user.login, c.env.ADMIN_USERS)
    if (!isAdmin) {
        return c.json(FailCode('需要管理员权限', StatusCode.NotAuth))
    }
    
    await next()
}

// ============================================
// 用户管理接口
// ============================================

/**
 * 获取所有用户列表
 */
adminRoutes.get('/admin/users', auth, adminAuth, async (c) => {
    try {
        const result = await c.env.DB.prepare(
            'SELECT * FROM users ORDER BY created_at DESC'
        ).all()
        
        const users = ((result.results || []) as unknown as DbUser[]).map((u: DbUser) => ({
            id: u.id,
            githubId: u.github_id,
            login: u.login,
            name: u.name,
            avatarUrl: u.avatar_url,
            role: u.role,
            canViewAll: u.can_view_all === 1,
            storageQuota: u.storage_quota,
            storageUsed: u.storage_used,
            uploadCount: u.upload_count,
            createdAt: u.created_at,
            lastLoginAt: u.last_login_at
        }))
        
        return c.json(Ok(users))
    } catch (e) {
        console.error('Failed to get users:', e)
        return c.json(Fail(`获取用户列表失败: ${(e as Error).message}`))
    }
})

/**
 * 获取单个用户信息
 */
adminRoutes.get('/admin/users/:login', auth, adminAuth, async (c) => {
    const login = c.req.param('login')
    
    try {
        const user = await c.env.DB.prepare(
            'SELECT * FROM users WHERE login = ?'
        ).bind(login).first<DbUser>()
        
        if (!user) {
            return c.json(Fail('用户不存在'))
        }
        
        return c.json(Ok({
            id: user.id,
            githubId: user.github_id,
            login: user.login,
            name: user.name,
            avatarUrl: user.avatar_url,
            role: user.role,
            canViewAll: user.can_view_all === 1,
            storageQuota: user.storage_quota,
            storageUsed: user.storage_used,
            uploadCount: user.upload_count,
            createdAt: user.created_at,
            lastLoginAt: user.last_login_at
        }))
    } catch (e) {
        console.error('Failed to get user:', e)
        return c.json(Fail(`获取用户失败: ${(e as Error).message}`))
    }
})

/**
 * 授权/取消授权用户查看所有图片
 */
adminRoutes.post('/admin/users/:login/view-all', auth, adminAuth, async (c) => {
    const login = c.req.param('login')
    const { grant } = await c.req.json<{ grant: boolean }>()
    
    try {
        const result = await c.env.DB.prepare(
            'UPDATE users SET can_view_all = ? WHERE login = ?'
        ).bind(grant ? 1 : 0, login).run()
        
        if (result.meta.changes === 0) {
            return c.json(Fail('用户不存在'))
        }
        
        // 记录审计日志
        const adminUser = c.get('user') as User | undefined
        await c.env.DB.prepare(
            `INSERT INTO audit_logs (user_id, user_login, action, target_key, details) 
             VALUES (?, ?, ?, ?, ?)`
        ).bind(
            adminUser?.id || null,
            adminUser?.login || 'admin_token',
            grant ? 'grant_permission' : 'revoke_permission',
            login,
            JSON.stringify({ permission: 'view_all', grant })
        ).run()
        
        return c.json(Ok({ login, canViewAll: grant }))
    } catch (e) {
        console.error('Failed to update user permission:', e)
        return c.json(Fail(`更新权限失败: ${(e as Error).message}`))
    }
})

/**
 * 设置用户角色
 */
adminRoutes.post('/admin/users/:login/role', auth, adminAuth, async (c) => {
    const login = c.req.param('login')
    const { role } = await c.req.json<{ role: 'admin' | 'user' }>()
    
    if (role !== 'admin' && role !== 'user') {
        return c.json(Fail('无效的角色'))
    }
    
    try {
        const result = await c.env.DB.prepare(
            'UPDATE users SET role = ?, can_view_all = ? WHERE login = ?'
        ).bind(role, role === 'admin' ? 1 : 0, login).run()
        
        if (result.meta.changes === 0) {
            return c.json(Fail('用户不存在'))
        }
        
        // 记录审计日志
        const adminUser = c.get('user') as User | undefined
        await c.env.DB.prepare(
            `INSERT INTO audit_logs (user_id, user_login, action, target_key, details) 
             VALUES (?, ?, ?, ?, ?)`
        ).bind(
            adminUser?.id || null,
            adminUser?.login || 'admin_token',
            role === 'admin' ? 'grant_permission' : 'revoke_permission',
            login,
            JSON.stringify({ permission: 'admin_role', role })
        ).run()
        
        return c.json(Ok({ login, role }))
    } catch (e) {
        console.error('Failed to update user role:', e)
        return c.json(Fail(`更新角色失败: ${(e as Error).message}`))
    }
})

/**
 * 设置用户存储配额
 */
adminRoutes.post('/admin/users/:login/quota', auth, adminAuth, async (c) => {
    const login = c.req.param('login')
    const { quota } = await c.req.json<{ quota: number }>()
    
    if (typeof quota !== 'number' || quota < 0) {
        return c.json(Fail('无效的配额值'))
    }
    
    try {
        const result = await c.env.DB.prepare(
            'UPDATE users SET storage_quota = ? WHERE login = ?'
        ).bind(quota, login).run()
        
        if (result.meta.changes === 0) {
            return c.json(Fail('用户不存在'))
        }
        
        return c.json(Ok({ login, storageQuota: quota }))
    } catch (e) {
        console.error('Failed to update user quota:', e)
        return c.json(Fail(`更新配额失败: ${(e as Error).message}`))
    }
})

// ============================================
// 统计接口
// ============================================

/**
 * 获取系统总体统计
 */
adminRoutes.get('/admin/stats', auth, adminAuth, async (c) => {
    try {
        const [userCount, imageCount, totalSize, recentUploads] = await Promise.all([
            c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
            c.env.DB.prepare('SELECT COUNT(*) as count FROM images').first<{ count: number }>(),
            c.env.DB.prepare('SELECT COALESCE(SUM(size), 0) as total FROM images').first<{ total: number }>(),
            c.env.DB.prepare(
                `SELECT COUNT(*) as count FROM images 
                 WHERE created_at >= datetime('now', '-7 days')`
            ).first<{ count: number }>()
        ])
        
        return c.json(Ok({
            userCount: userCount?.count || 0,
            imageCount: imageCount?.count || 0,
            totalSize: totalSize?.total || 0,
            recentUploads: recentUploads?.count || 0
        }))
    } catch (e) {
        console.error('Failed to get stats:', e)
        return c.json(Fail(`获取统计失败: ${(e as Error).message}`))
    }
})

/**
 * 获取用户统计
 */
adminRoutes.get('/admin/users/:login/stats', auth, adminAuth, async (c) => {
    const login = c.req.param('login')
    
    try {
        const [imageCount, totalSize, totalViews, recentUploads] = await Promise.all([
            c.env.DB.prepare(
                'SELECT COUNT(*) as count FROM images WHERE user_login = ?'
            ).bind(login).first<{ count: number }>(),
            c.env.DB.prepare(
                'SELECT COALESCE(SUM(size), 0) as total FROM images WHERE user_login = ?'
            ).bind(login).first<{ total: number }>(),
            c.env.DB.prepare(
                'SELECT COALESCE(SUM(view_count), 0) as total FROM images WHERE user_login = ?'
            ).bind(login).first<{ total: number }>(),
            c.env.DB.prepare(
                `SELECT COUNT(*) as count FROM images 
                 WHERE user_login = ? AND created_at >= datetime('now', '-7 days')`
            ).bind(login).first<{ count: number }>()
        ])
        
        return c.json(Ok(<UserStats>{
            totalImages: imageCount?.count || 0,
            totalSize: totalSize?.total || 0,
            totalViews: totalViews?.total || 0,
            recentUploads: recentUploads?.count || 0
        }))
    } catch (e) {
        console.error('Failed to get user stats:', e)
        return c.json(Fail(`获取用户统计失败: ${(e as Error).message}`))
    }
})

// ============================================
// 审计日志接口
// ============================================

/**
 * 获取审计日志
 */
adminRoutes.get('/admin/audit-logs', auth, adminAuth, async (c) => {
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')
    const action = c.req.query('action')
    const userLogin = c.req.query('user')
    
    try {
        let query = 'SELECT * FROM audit_logs WHERE 1=1'
        const params: any[] = []
        
        if (action) {
            query += ' AND action = ?'
            params.push(action)
        }
        if (userLogin) {
            query += ' AND user_login = ?'
            params.push(userLogin)
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        params.push(limit, offset)
        
        const result = await c.env.DB.prepare(query).bind(...params).all()
        
        return c.json(Ok({
            logs: result.results || [],
            hasMore: (result.results?.length || 0) === limit
        }))
    } catch (e) {
        console.error('Failed to get audit logs:', e)
        return c.json(Fail(`获取审计日志失败: ${(e as Error).message}`))
    }
})

// ============================================
// 当前用户接口（非管理员也可访问）
// ============================================

/**
 * 获取当前用户信息和权限
 */
adminRoutes.get('/user/me', auth, async (c) => {
    const user = c.get('user') as User | undefined
    const isAdminToken = c.get('isAdminToken') || false
    
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
})

/**
 * 获取当前用户的统计信息
 */
adminRoutes.get('/user/me/stats', auth, async (c) => {
    const user = c.get('user') as User | undefined
    
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
})

export default adminRoutes
