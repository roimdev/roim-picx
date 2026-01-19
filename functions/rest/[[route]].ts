import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import type { R2Bucket, KVNamespace, R2Object, R2ListOptions } from '@cloudflare/workers-types'
import StatusCode, { Ok, Fail, Build, ImgItem, ImgList, ImgReq, Folder, AuthToken, FailCode, NotAuth } from "./type"
import { checkFileType, getFileName, parseRange } from './utils'

// Bindings types
type Bindings = {
    BASE_URL: string
    XK: KVNamespace
    PICX: R2Bucket
    PICX_AUTH_TOKEN: string
    GITHUB_CLIENT_ID: string
    GITHUB_CLIENT_SECRET: string
    GITHUB_OWNER: string
}

type Variables = {}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/rest')

// Auth middleware for non-GET/OPTIONS requests
const auth = async (c: any, next: () => Promise<void>) => {
    const method = c.req.method
    if (method === "GET" || method === "OPTIONS" || c.req.path.startsWith('/rest/github/login')) {
        await next()
        return
    }
    // get user token
    const token = c.req.header('Authorization')
    if (!token) {
        return c.json(NotAuth())
    }
    // with env equal
    const authKey = c.env.PICX_AUTH_TOKEN
    if (!authKey) {
        return c.json(Fail("system not auth setting"))
    }
    if (authKey !== token) {
        return c.json(FailCode("auth fail", StatusCode.NotAuth))
    }
    await next()
}

// GitHub Login
app.post('/github/login', async (c) => {
    const { code } = await c.req.json<{ code: string }>()
    if (!code) return c.json(Fail("Missing code"))

    const clientId = c.env.GITHUB_CLIENT_ID
    const clientSecret = c.env.GITHUB_CLIENT_SECRET
    const owner = c.env.GITHUB_OWNER

    if (!clientId || !clientSecret) {
        return c.json(Fail("GitHub auth not configured"))
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

        return c.json(Ok(c.env.PICX_AUTH_TOKEN))
    } catch (e: any) {
        return c.json(Fail(e.message))
    }
})

// 检测token是否有效
app.post('/checkToken', async (c) => {
    const data = await c.req.json<AuthToken>()
    const token = data.token
    if (!token) {
        return c.json(Ok(false))
    }
    const authKey = c.env.PICX_AUTH_TOKEN
    if (!authKey) {
        return c.json(Ok(false))
    }
    if (authKey !== token) {
        return c.json(Ok(false))
    }
    return c.json(Ok(true))
})

// list image
app.post('/list', auth, async (c) => {
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
    const options: R2ListOptions = {
        limit: data.limit,
        cursor: data.cursor,
        delimiter: data.delimiter,
        prefix: include
    }
    const list = await c.env.PICX.list(options)
    const truncated = list.truncated ? list.truncated : false
    const cursor = list.cursor
    // 按上传时间倒序排列
    const objs = [...list.objects].sort((a: any, b: any) => {
        const timeA = a.uploaded ? new Date(a.uploaded).getTime() : 0
        const timeB = b.uploaded ? new Date(b.uploaded).getTime() : 0
        return timeB - timeA
    })
    const urls = objs.map((it: any) => {
        return <ImgItem>{
            url: `${c.env.BASE_URL}/rest/${it.key}`,
            key: it.key,
            size: it.size
        }
    })
    return c.json(Ok(<ImgList>{
        list: urls,
        next: truncated,
        cursor: cursor,
        prefixes: list.delimitedPrefixes
    }))
})

// batch upload file
app.post('/upload', auth, async (c) => {
    const files = await c.req.formData()
    const images = files.getAll("files")
    let customPath = files.get("path")
    const keepName = files.get("keepName") === 'true'

    if (customPath) {
        customPath = customPath.toString()
        if (!customPath.endsWith('/')) {
            customPath += '/'
        }
        // Remove leading slash if present to avoid double slashes with base URL or empty bucket names
        if (customPath.startsWith('/')) {
            customPath = customPath.substring(1)
        }
    } else {
        customPath = ''
    }

    const errs: string[] = []
    const urls = Array<ImgItem>()
    for (let item of images) {
        const file = item as File
        const fileType = file.type
        if (!checkFileType(fileType)) {
            errs.push(`${fileType} not support.`)
            continue
        }
        const delToken = crypto.randomUUID()
        const time = new Date().getTime()

        let filename = ''
        if (keepName && file.name) {
            // Sanitize filename: replace non-alphanumeric chars (except ._-) with _
            // This ensures compatibility with R2 keys and URLs
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
            if (safeName) {
                filename = safeName
            }
        }

        // Fallback or default filename generation
        if (!filename) {
            filename = await getFileName(fileType, time)
        }

        const fullPath = customPath + filename
        const header = new Headers()
        header.set("content-type", fileType)
        header.set("content-length", `${file.size}`)
        const object = await c.env.PICX.put(fullPath, file.stream(), {
            httpMetadata: header,
        }) as R2Object
        if (object || object.key) {
            // 存储删除token
            await c.env.XK.put(`del:${delToken}`, object.key)
            urls.push({
                key: object.key,
                size: object.size,
                url: `${c.env.BASE_URL}/rest/${object.key}`,
                filename: file.name,
                delToken: delToken
            })
        }
    }
    return c.json(Build(urls, errs.toString()))
})

// 创建目录
app.post("/folder", auth, async (c) => {
    try {
        const data = await c.req.json<Folder>()
        // Allow letters, numbers, underscores, and hyphens
        const regx = /^[A-Za-z0-9_-]+$/
        if (!data.name || !regx.test(data.name)) {
            return c.json(Fail("Folder name error: only letters, numbers, underscores and hyphens allowed"))
        }
        await c.env.PICX.put(data.name + '/', null)
        return c.json(Ok("Success"))
    } catch (e) {
        console.error('Create folder error:', e)
        return c.json(Fail(`Create folder fail: ${(e as Error).message}`))
    }
})

// 重命名文件
app.post('/rename', auth, async (c) => {
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
app.get('/del/:id{.+}', async (c) => {
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
app.delete("/", auth, async (c) => {
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
app.get('/delInfo/:token', async (c) => {
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
        size: object.size
    }))
})

// 确认删除图片 (公开)
app.post('/delImage/:token', async (c) => {
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
app.get("/:id{.+}", async (c) => {
    let id = c.req.param('id')
    const range = parseRange(c.req.header('range') || null)
    const object = await c.env.PICX.get(id, {
        range,
        onlyIf: c.req.raw.headers,
    })
    if (object == null) {
        return c.json(Fail("object not found"))
    }
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    if (range) {
        headers.set("content-range", `bytes ${range.offset}-${range.end}/${object.size}`)
    }
    const status = object.body ? (range ? 206 : 200) : 304
    return new Response(object.body, {
        headers,
        status
    })
})

// Error handling
app.onError((err, c) => {
    console.error(`${err}`)
    return c.json(Fail(err.message), 500)
})

// Not found handling
app.notFound((c) => {
    return c.json(Fail('not found'), 404)
})

export const onRequest = handle(app)
export { app }
export type { Bindings }
