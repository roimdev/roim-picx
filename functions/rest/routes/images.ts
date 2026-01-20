import { Hono } from 'hono'
import type { R2ListOptions } from '@cloudflare/workers-types'
import { Ok, Fail, ImgItem, ImgList, ImgReq } from '../type'
import { parseRange } from '../utils'
import { auth, type AppEnv } from '../middleware/auth'
import { listRateLimit } from '../middleware/rateLimit'

const imageRoutes = new Hono<AppEnv>()

// list image (with rate limiting)
imageRoutes.post('/list', listRateLimit, auth, async (c) => {
    const data = await c.req.json<ImgReq>()
    if (!data.limit) {
        data.limit = 10
    }
    if (data.limit > 100) {
        data.limit = 100
    }
    if (!data.delimiter) {
        data.delimiter = "/"
    }
    let include: string | undefined = undefined
    if (data.delimiter !== "/") {
        include = data.delimiter
    }

    const keyword = data.keyword?.trim().toLowerCase()

    // If keyword search is enabled, we need to fetch more items to filter
    // Since R2 doesn't support keyword search natively, we filter on backend
    const fetchLimit = data.limit
    const options: R2ListOptions = {
        limit: fetchLimit,
        cursor: data.cursor,
        delimiter: keyword ? undefined : data.delimiter, // Disable delimiter for keyword search to search all files
        prefix: keyword ? include : include,
        include: ['customMetadata']
    }
    const list = await c.env.PICX.list(options)

    // Filter and process objects
    const now = Date.now()
    let objs = [...list.objects].filter((obj: any) => {
        // Filter expired images
        if (obj.customMetadata && obj.customMetadata.expires) {
            const expiresAt = parseInt(obj.customMetadata.expires)
            if (!isNaN(expiresAt) && now > expiresAt) {
                c.executionCtx.waitUntil(c.env.PICX.delete(obj.key))
                return false
            }
        }
        return true
    })

    // Apply keyword filter if provided
    if (keyword) {
        objs = objs.filter((obj: any) => {
            const filename = obj.key.toLowerCase()
            return filename.includes(keyword)
        })
    }

    // Sort by upload time descending
    objs.sort((a: any, b: any) => {
        const timeA = a.uploaded ? new Date(a.uploaded).getTime() : 0
        const timeB = b.uploaded ? new Date(b.uploaded).getTime() : 0
        return timeB - timeA
    })

    // Limit results to requested limit
    const hasMoreResults = objs.length > data.limit
    const limitedObjs = objs.slice(0, data.limit)

    // Determine if there's more to load
    const truncated = list.truncated || hasMoreResults

    const urls = limitedObjs.map((it: any) => {
        let uploaderName = it.customMetadata?.uploaderName
        if (uploaderName) {
            try {
                uploaderName = decodeURIComponent(uploaderName)
            } catch (e) {
                // ignore error
            }
        }
        return <ImgItem>{
            url: `${c.env.BASE_URL}/rest/${it.key}`,
            key: it.key,
            size: it.size,
            originalName: it.customMetadata?.originalName,
            uploaderName: uploaderName,
            uploadedBy: it.customMetadata?.uploadedBy,
            uploadedAt: it.uploaded ? new Date(it.uploaded).getTime() : undefined
        }
    })

    return c.json(Ok(<ImgList>{
        list: urls,
        next: truncated,
        cursor: list.cursor,
        prefixes: keyword ? [] : list.delimitedPrefixes // Hide prefixes during search
    }))
})

// 重命名文件
imageRoutes.post('/rename', auth, async (c) => {
    try {
        const data = await c.req.json<{ oldKey: string, newKey: string }>()
        if (!data.oldKey || !data.newKey) {
            return c.json(Fail("Missing oldKey or newKey"))
        }

        const oldObject = await c.env.PICX.get(data.oldKey)
        if (!oldObject) {
            return c.json(Fail("File not found"))
        }

        // Copy file to new key
        await c.env.PICX.put(data.newKey, oldObject.body, {
            httpMetadata: oldObject.httpMetadata,
            customMetadata: oldObject.customMetadata,
        })

        // Delete old file
        await c.env.PICX.delete(data.oldKey)

        return c.json(Ok({ oldKey: data.oldKey, newKey: data.newKey }))
    } catch (e) {
        return c.json(Fail(`Rename failed: ${(e as Error).message}`))
    }
})

// 删除key (GET方式，保持兼容)
imageRoutes.get('/del/:id{.+}', async (c) => {
    const key = c.req.param('id')
    if (!key) {
        return c.json(Fail("not delete key"))
    }
    try {
        await c.env.PICX.delete(key)
    } catch (e) {
        console.log(`img delete error:${(e as Error).message}`,)
    }
    return c.json(Ok(key))
})

// delete image (DELETE方式)
imageRoutes.delete("/", auth, async (c) => {
    const params = await c.req.json<{ keys: string }>()
    const keys = params.keys
    if (!keys || keys.length < 1) {
        return c.json(Fail("not delete keys"))
    }
    const arr = keys.split(',')
    try {
        for (let it of arr) {
            if (it && it.length) {
                await c.env.PICX.delete(it)
            }
        }
    } catch (e) {
        console.log(`img delete error:${(e as Error).message}`,)
    }
    return c.json(Ok(keys))
})

// 获取删除链接信息 (公开)
imageRoutes.get('/delInfo/:token', async (c) => {
    const token = c.req.param('token')
    if (!token) {
        return c.json(Fail("token is required"))
    }
    const key = await c.env.XK.get(`del:${token}`)
    if (!key) {
        return c.json(Fail("Invalid or expired deletion link"))
    }
    const object = await c.env.PICX.head(key)
    if (!object) {
        return c.json(Fail("Image not found"))
    }

    return c.json(Ok({
        key: key,
        url: `${c.env.BASE_URL}/rest/${key}`,
        size: object.size,
        originalName: object.customMetadata?.originalName
    }))
})

// 确认删除图片 (公开)
imageRoutes.post('/delImage/:token', async (c) => {
    const token = c.req.param('token')
    if (!token) {
        return c.json(Fail("token is required"))
    }
    const key = await c.env.XK.get(`del:${token}`)
    if (!key) {
        return c.json(Fail("Invalid or expired deletion link"))
    }

    try {
        await c.env.PICX.delete(key)
        await c.env.XK.delete(`del:${token}`)
        return c.json(Ok("Delete success"))
    } catch (e) {
        return c.json(Fail(`Delete failed: ${(e as Error).message}`))
    }
})

// image detail - catch-all for image keys
imageRoutes.get("/:id{.+}", async (c) => {
    let id = c.req.param('id')
    const range = parseRange(c.req.header('range') || null)
    const object = await c.env.PICX.get(id, {
        range,
        onlyIf: c.req.raw.headers as any,
    })
    if (object == null) {
        return c.json(Fail("object not found"))
    }

    // Check for expiration
    if (object.customMetadata && object.customMetadata.expires) {
        const expiresAt = parseInt(object.customMetadata.expires)
        if (!isNaN(expiresAt) && Date.now() > expiresAt) {
            // Expired: Delete asynchronously and return 404
            c.executionCtx.waitUntil(c.env.PICX.delete(id))
            return c.json(Fail("Image expired"), 404)
        }
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    if (range) {
        headers.set("content-range", `bytes ${range.offset}-${range.end}/${object.size}`)
    }
    const status = (object as any).body ? (range ? 206 : 200) : 304
    return new Response((object as any).body, {
        headers,
        status
    })
})

export default imageRoutes
