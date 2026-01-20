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
// 访问分析接口
// ============================================

/**
 * 获取访问统计概览
 */
adminRoutes.get('/admin/analytics/overview', auth, adminAuth, async (c) => {
    try {
        const [todayViews, weekViews, monthViews, topCountries, topReferers] = await Promise.all([
            // 今日访问
            c.env.DB.prepare(
                `SELECT COUNT(*) as count FROM image_stats 
                 WHERE accessed_at >= datetime('now', '-1 day')`
            ).first<{ count: number }>(),
            // 本周访问
            c.env.DB.prepare(
                `SELECT COUNT(*) as count FROM image_stats 
                 WHERE accessed_at >= datetime('now', '-7 days')`
            ).first<{ count: number }>(),
            // 本月访问
            c.env.DB.prepare(
                `SELECT COUNT(*) as count FROM image_stats 
                 WHERE accessed_at >= datetime('now', '-30 days')`
            ).first<{ count: number }>(),
            // 访问来源国家 Top 10
            c.env.DB.prepare(
                `SELECT country, COUNT(*) as count FROM image_stats 
                 WHERE country IS NOT NULL AND accessed_at >= datetime('now', '-30 days')
                 GROUP BY country ORDER BY count DESC LIMIT 10`
            ).all(),
            // 访问来源网站 Top 10
            c.env.DB.prepare(
                `SELECT referer, COUNT(*) as count FROM image_stats 
                 WHERE referer IS NOT NULL AND accessed_at >= datetime('now', '-30 days')
                 GROUP BY referer ORDER BY count DESC LIMIT 10`
            ).all()
        ])
        
        return c.json(Ok({
            todayViews: todayViews?.count || 0,
            weekViews: weekViews?.count || 0,
            monthViews: monthViews?.count || 0,
            topCountries: topCountries.results || [],
            topReferers: topReferers.results || []
        }))
    } catch (e) {
        console.error('Failed to get analytics overview:', e)
        return c.json(Fail(`获取访问统计失败: ${(e as Error).message}`))
    }
})

/**
 * 获取每日访问趋势（最近30天）
 */
adminRoutes.get('/admin/analytics/trend', auth, adminAuth, async (c) => {
    try {
        const result = await c.env.DB.prepare(
            `SELECT DATE(accessed_at) as date, COUNT(*) as count 
             FROM image_stats 
             WHERE accessed_at >= datetime('now', '-30 days')
             GROUP BY DATE(accessed_at) 
             ORDER BY date ASC`
        ).all()
        
        return c.json(Ok(result.results || []))
    } catch (e) {
        console.error('Failed to get analytics trend:', e)
        return c.json(Fail(`获取访问趋势失败: ${(e as Error).message}`))
    }
})

/**
 * 获取热门图片排行
 */
adminRoutes.get('/admin/analytics/top-images', auth, adminAuth, async (c) => {
    const limit = parseInt(c.req.query('limit') || '20')
    const days = parseInt(c.req.query('days') || '30')
    
    try {
        const result = await c.env.DB.prepare(
            `SELECT i.key, i.original_name, i.user_login, i.size, i.view_count,
                    COUNT(s.id) as recent_views
             FROM images i
             LEFT JOIN image_stats s ON i.key = s.image_key 
                AND s.accessed_at >= datetime('now', '-' || ? || ' days')
             GROUP BY i.key
             ORDER BY recent_views DESC, i.view_count DESC
             LIMIT ?`
        ).bind(days, limit).all()
        
        return c.json(Ok(result.results || []))
    } catch (e) {
        console.error('Failed to get top images:', e)
        return c.json(Fail(`获取热门图片失败: ${(e as Error).message}`))
    }
})

/**
 * 获取单张图片的访问详情
 */
adminRoutes.get('/admin/analytics/image/:key{.+}', auth, adminAuth, async (c) => {
    const key = c.req.param('key')
    const limit = parseInt(c.req.query('limit') || '100')
    
    try {
        const [imageInfo, recentAccess, dailyTrend] = await Promise.all([
            // 图片基本信息
            c.env.DB.prepare('SELECT * FROM images WHERE key = ?').bind(key).first(),
            // 最近访问记录
            c.env.DB.prepare(
                `SELECT accessed_at, referer, country, city, user_agent 
                 FROM image_stats WHERE image_key = ? 
                 ORDER BY accessed_at DESC LIMIT ?`
            ).bind(key, limit).all(),
            // 每日访问趋势
            c.env.DB.prepare(
                `SELECT DATE(accessed_at) as date, COUNT(*) as count 
                 FROM image_stats WHERE image_key = ? AND accessed_at >= datetime('now', '-30 days')
                 GROUP BY DATE(accessed_at) ORDER BY date ASC`
            ).bind(key).all()
        ])
        
        return c.json(Ok({
            image: imageInfo,
            recentAccess: recentAccess.results || [],
            dailyTrend: dailyTrend.results || []
        }))
    } catch (e) {
        console.error('Failed to get image analytics:', e)
        return c.json(Fail(`获取图片访问详情失败: ${(e as Error).message}`))
    }
})

/**
 * 获取用户的访问统计
 */
adminRoutes.get('/admin/analytics/user/:login', auth, adminAuth, async (c) => {
    const login = c.req.param('login')
    
    try {
        const [totalViews, topImages, recentActivity] = await Promise.all([
            // 总访问量
            c.env.DB.prepare(
                `SELECT COUNT(*) as count FROM image_stats s
                 JOIN images i ON s.image_key = i.key
                 WHERE i.user_login = ?`
            ).bind(login).first<{ count: number }>(),
            // 用户热门图片
            c.env.DB.prepare(
                `SELECT i.key, i.original_name, i.view_count
                 FROM images i WHERE i.user_login = ?
                 ORDER BY i.view_count DESC LIMIT 10`
            ).bind(login).all(),
            // 最近7天每日访问
            c.env.DB.prepare(
                `SELECT DATE(s.accessed_at) as date, COUNT(*) as count 
                 FROM image_stats s
                 JOIN images i ON s.image_key = i.key
                 WHERE i.user_login = ? AND s.accessed_at >= datetime('now', '-7 days')
                 GROUP BY DATE(s.accessed_at) ORDER BY date ASC`
            ).bind(login).all()
        ])
        
        return c.json(Ok({
            totalViews: totalViews?.count || 0,
            topImages: topImages.results || [],
            recentActivity: recentActivity.results || []
        }))
    } catch (e) {
        console.error('Failed to get user analytics:', e)
        return c.json(Fail(`获取用户访问统计失败: ${(e as Error).message}`))
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
