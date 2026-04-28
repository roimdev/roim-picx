import { Hono } from 'hono'
import { Ok, Fail, Folder } from '../type'
import { auth, type AppEnv } from '../middleware/auth'

const folderRoutes = new Hono<AppEnv>()

// 创建目录
folderRoutes.post("/folder", auth, async (c) => {
    try {
        const data = await c.req.json<Folder>()
        // Allow letters, numbers, underscores, hyphens and Chinese
        const regx = /^[A-Za-z0-9_-\u4e00-\u9fa5]+$/
        if (!data.name || !regx.test(data.name)) {
            return c.json(Fail("Folder name error: only letters, numbers, underscores, hyphens and Chinese allowed"))
        }
        await c.env.PICX.put(data.name + '/', null)
        return c.json(Ok("Success"))
    } catch (e) {
        console.error('Create folder error:', e)
        return c.json(Fail(`Create folder fail: ${(e as Error).message}`))
    }
})

export default folderRoutes
