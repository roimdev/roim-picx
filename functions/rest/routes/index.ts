import { router } from '../router';
import { Env } from '../[[path]]'
import { json } from 'itty-router-extras';
import { Ok, Fail, Build, ImgItem, ImgList, ImgReq, Folder } from "../type";
import { checkFileType, getFileName, parseRange } from '../utils'
import { R2ListOptions } from "@cloudflare/workers-types";

// list image
router.post('/list', async (req : Request, env : Env) => {
    const data = await req.json() as ImgReq
    if (!data.limit) {
        data.limit = 10
    }
    if (data.limit > 100) {
        data.limit = 100
    }
    if (!data.delimiter) {
        data.delimiter = "/"
    }
    let include = undefined
    if (data.delimiter != "/") {
        include = data.delimiter
    }
    // console.log(include)
    const options = <R2ListOptions>{
        limit: data.limit,
        cursor: data.cursor,
        delimiter: data.delimiter,
        prefix: include
    }
    const list = await env.PICX.list(options)
    // console.log(list)
    const truncated = list.truncated ? list.truncated : false
    const cursor = list.cursor
    const objs = list.objects
    const urls = objs.map(it => {
        return <ImgItem> {
            url: `${env.BASE_URL}/rest/${it.key}`,
            key: it.key,
            size: it.size
        }
    })
    return json(Ok(<ImgList>{
        list: urls,
        next: truncated,
        cursor: cursor,
        prefixes: list.delimitedPrefixes
    }))
})

// batch upload file
router.post('/upload', async (req: Request, env : Env) => {
    const files = await req.formData()
    const images = files.getAll("files")
    const errs = []
    const urls = Array<ImgItem>()
    for (let item of images) {
        const fileType = item.type
        if (!checkFileType(fileType)) {
            errs.push(`${fileType} not support.`)
            continue
        }
        const time = new Date().getTime()
        const filename = await getFileName(fileType, time)
        const header = new Headers()
        header.set("content-type", fileType)
        header.set("content-length", `${item.size}`)
        const object = await env.PICX.put(filename, item.stream(), {
            httpMetadata: header,
        }) as R2Object
        if (object || object.key) {
            urls.push({
                key: object.key,
                size: object.size,
                url: `${env.BASE_URL}/rest/${object.key}`,
                filename: item.name
            })
        }
    }
    return json(Build(urls, errs.toString()))
})

// ????????????
router.post("/folder", async (req: Request, env: Env) => {
    try {
        const data = await req.json() as Folder
        const regx = /^[A-Za-z_]+$/
        if (!regx.test(data.name)) {
            return json(Fail("Folder name error"))
        }
        await env.PICX.put(data.name + '/', "")
        return json(Ok("Success"))
    } catch (e) {
        return json(Fail("Create folder fail"))
    }
})

// delete image
router.delete("/", async (req : Request, env: Env) => {
    const params = await req.json()
    // console.log(params)
    const keys = params.keys;
    if (!keys || keys.length < 1) {
        return json(Fail("not delete keys"))
    }
    const arr = keys.split(',')
    try {
        for (let it of arr) {
            if(it && it.length) {
                await env.PICX.delete(it)
            }
        }
    } catch (e) {
        console.log(`img delete error:${e.message}`,)
    }
    return json(Ok(keys))
})

// image detail
router.get("/:id+", async (req : Request, env : Env) => {
    let id = req.params.id
    const range = parseRange(req.headers.get('range'))
    const object = await env.PICX.get(id, {
        range,
        onlyIf: req.headers,
    })
    if (object == null) {
        return json(Fail("object not found"))
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
