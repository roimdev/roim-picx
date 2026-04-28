
import { Hono } from 'hono'
import { Ok, Fail } from '../type'
import { auth, adminAuth, type AppEnv } from '../middleware/auth'
import { ConfigService, type UploadConfigItem } from '../services/ConfigService'

const settingsRoutes = new Hono<AppEnv>()

/**
 * 获取上传配置
 */
settingsRoutes.get('/upload', auth, adminAuth, async (c) => {
    try {
        const service = new ConfigService(c.env.DB)
        const config = await service.getUploadConfig()
        return c.json(Ok(config))
    } catch (e) {
        console.error('Failed to get upload config:', e)
        return c.json(Fail(`获取上传配置失败: ${(e as Error).message}`))
    }
})

/**
 * 更新上传配置
 */
settingsRoutes.post('/upload', auth, adminAuth, async (c) => {
    try {
        const config = await c.req.json<UploadConfigItem[]>()

        // Simple validation
        if (!Array.isArray(config)) {
            return c.json(Fail('Invalid config format'))
        }

        const service = new ConfigService(c.env.DB)
        const success = await service.updateUploadConfig(config)

        if (success) {
            return c.json(Ok(config))
        } else {
            return c.json(Fail('Failed to update config'))
        }
    } catch (e) {
        console.error('Failed to update upload config:', e)
        return c.json(Fail(`更新上传配置失败: ${(e as Error).message}`))
    }
})

/**
 * 获取 Token 过期时间设置
 */
settingsRoutes.get('/token-expire', auth, adminAuth, async (c) => {
    try {
        const service = new ConfigService(c.env.DB)
        const days = await service.getTokenExpireDays()
        return c.json(Ok({ days }))
    } catch (e) {
        return c.json(Fail(`获取 Token 过期配置失败: ${(e as Error).message}`))
    }
})

/**
 * 更新 Token 过期时间设置
 */
settingsRoutes.post('/token-expire', auth, adminAuth, async (c) => {
    try {
        const { days } = await c.req.json<{ days: number }>()

        if (!days || days <= 0) {
            return c.json(Fail('Invalid days value'))
        }

        const service = new ConfigService(c.env.DB)
        const success = await service.updateTokenExpireDays(days)

        if (success) {
            return c.json(Ok({ days }))
        } else {
            return c.json(Fail('Failed to update config'))
        }
    } catch (e) {
        return c.json(Fail(`更新 Token 过期配置失败: ${(e as Error).message}`))
    }
})

export default settingsRoutes
