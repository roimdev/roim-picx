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
}

type Variables = {}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/rest')

// Auth middleware for non-GET/OPTIONS requests
const auth = async (c: any, next: () => Promise<void>) => {
    const method = c.req.method
    if (method === "GET" || method === "OPTIONS") {
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
    const objs = list.objects
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
        const time = new Date().getTime()
        const filename = await getFileName(fileType, time)
        const fullPath = customPath + filename
        const header = new Headers()
        header.set("content-type", fileType)
        header.set("content-length", `${file.size}`)
        const object = await c.env.PICX.put(fullPath, file.stream(), {
            httpMetadata: header,
        }) as R2Object
        if (object || object.key) {
            urls.push({
                key: object.key,
                size: object.size,
                url: `${c.env.BASE_URL}/rest/${object.key}`,
                filename: file.name
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
