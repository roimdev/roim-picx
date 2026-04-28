import type { R2Bucket } from '@cloudflare/workers-types'
import { ImgItem } from './type'

export interface StorageResult {
    key: string
    size: number
    url?: string
}

export interface StorageProvider {
    put(key: string, body: ReadableStream | ArrayBuffer | string, options: {
        contentType: string,
        metadata?: Record<string, string>
    }): Promise<StorageResult>

    delete(key: string): Promise<void>

    get(key: string, options?: { range?: { offset: number, length: number } }): Promise<{
        body: ReadableStream | null
        contentType?: string
        size: number
        metadata?: Record<string, string>
    } | null>

    head(key: string): Promise<{
        size: number
        contentType?: string
        metadata?: Record<string, string>
    } | null>

    getPublicUrl(key: string): string
}

export class R2StorageProvider implements StorageProvider {
    constructor(private bucket: R2Bucket, private baseUrl: string) { }

    async put(key: string, body: any, options: any): Promise<StorageResult> {
        const object = await this.bucket.put(key, body, {
            httpMetadata: { contentType: options.contentType },
            customMetadata: options.metadata
        })
        return {
            key: object.key,
            size: object.size
        }
    }

    async delete(key: string): Promise<void> {
        await this.bucket.delete(key)
    }

    async get(key: string, options?: any): Promise<any> {
        const object = await this.bucket.get(key, options) as any
        if (!object) return null
        return {
            body: object.body,
            contentType: object.httpMetadata?.contentType,
            size: object.size,
            metadata: object.customMetadata
        }
    }

    async head(key: string): Promise<any> {
        const object = await this.bucket.head(key)
        if (!object) return null
        return {
            size: object.size,
            contentType: object.httpMetadata?.contentType,
            metadata: object.customMetadata
        }
    }

    getPublicUrl(key: string): string {
        return `${this.baseUrl}/rest/${key}`
    }
}

export class HFStorageProvider implements StorageProvider {
    private baseUrl = 'https://huggingface.co/api/datasets'
    private uploadUrl = 'https://huggingface.co'
    private resolveUrl = 'https://huggingface.co/datasets'

    constructor(private token: string, private repo: string, private appBaseUrl: string) { }

    private encodePathForUrl(path: string): string {
        return path
            .replace(/^\//, '')
            .split('/')
            .map(segment => encodeURIComponent(segment))
            .join('/')
    }

    private async bodyToBlob(body: any, contentType?: string): Promise<Blob> {
        if (body && typeof body.getReader === 'function') {
            const reader = body.getReader()
            const chunks: Uint8Array[] = []
            let done = false
            while (!done) {
                const result = await reader.read()
                done = result.done
                if (result.value) {
                    chunks.push(result.value)
                }
            }
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
            const combined = new Uint8Array(totalLength)
            let offset = 0
            for (const chunk of chunks) {
                combined.set(chunk, offset)
                offset += chunk.length
            }
            return new Blob([combined], { type: contentType || 'application/octet-stream' })
        }

        if (body instanceof ArrayBuffer) {
            return new Blob([body], { type: contentType || 'application/octet-stream' })
        }

        if (typeof body === 'string') {
            return new Blob([new TextEncoder().encode(body)], { type: contentType || 'text/plain' })
        }

        if (body instanceof Blob) {
            return body
        }

        if (body && typeof body.arrayBuffer === 'function') {
            const arrayBuffer = await body.arrayBuffer()
            return new Blob([arrayBuffer], { type: contentType || body.type || 'application/octet-stream' })
        }

        return new Blob([body], { type: contentType || 'application/octet-stream' })
    }

    private async sha256Hex(blob: Blob): Promise<string> {
        const buffer = await blob.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    private async getSampleBase64(blob: Blob): Promise<string> {
        const sampleBytes = new Uint8Array(await blob.slice(0, 512).arrayBuffer())
        let binary = ''
        for (let i = 0; i < sampleBytes.length; i++) {
            binary += String.fromCharCode(sampleBytes[i])
        }
        return btoa(binary)
    }

    private async preupload(filePath: string, fileSize: number, fileSample: string): Promise<any> {
        const url = `${this.uploadUrl}/api/datasets/${this.repo}/preupload/main`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: [{
                    path: filePath,
                    size: fileSize,
                    sample: fileSample
                }]
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`HF Preupload failed: ${response.status} - ${error}`)
        }

        return await response.json()
    }

    private async lfsBatch(oid: string, fileSize: number): Promise<any> {
        const url = `${this.uploadUrl}/datasets/${this.repo}.git/info/lfs/objects/batch`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.git-lfs+json',
                'Content-Type': 'application/vnd.git-lfs+json'
            },
            body: JSON.stringify({
                operation: 'upload',
                transfers: ['basic', 'multipart'],
                hash_algo: 'sha_256',
                ref: { name: 'main' },
                objects: [{ oid, size: fileSize }]
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`HF LFS batch failed: ${response.status} - ${error}`)
        }

        return await response.json()
    }

    private async uploadMultipart(uploadAction: any, file: Blob, oid: string): Promise<void> {
        const { href: completionUrl, header } = uploadAction
        const chunkSize = parseInt(header.chunk_size)
        const partKeys = Object.keys(header).filter(key => /^[0-9]+$/.test(key))

        const completeParts: Array<{ partNumber: number, etag: string }> = []
        for (const part of partKeys) {
            const index = parseInt(part) - 1
            const start = index * chunkSize
            const end = Math.min(start + chunkSize, file.size)
            const chunk = file.slice(start, end)

            const response = await fetch(header[part], {
                method: 'PUT',
                body: chunk
            })

            if (!response.ok) {
                const error = await response.text()
                throw new Error(`HF LFS multipart upload failed: ${response.status} - ${error}`)
            }

            let etag = response.headers.get('ETag') || ''
            etag = etag.replace(/^"|"$/g, '')
            if (!etag) {
                throw new Error(`HF LFS multipart upload missing ETag for part ${part}`)
            }
            completeParts.push({ partNumber: parseInt(part), etag })
        }

        const completeResponse = await fetch(completionUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.git-lfs+json',
                'Content-Type': 'application/vnd.git-lfs+json'
            },
            body: JSON.stringify({ oid, parts: completeParts })
        })

        if (!completeResponse.ok) {
            const error = await completeResponse.text()
            throw new Error(`HF LFS multipart complete failed: ${completeResponse.status} - ${error}`)
        }
    }

    private async uploadToLFS(uploadAction: any, file: Blob, oid: string): Promise<void> {
        const { href, header } = uploadAction
        if (header?.chunk_size) {
            await this.uploadMultipart(uploadAction, file, oid)
            return
        }

        const response = await fetch(href, {
            method: 'PUT',
            headers: header || {},
            body: file
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`HF LFS upload failed: ${response.status} - ${error}`)
        }
    }

    private async commitLfsFile(filePath: string, oid: string, fileSize: number, commitMessage: string): Promise<any> {
        const url = `${this.uploadUrl}/api/datasets/${this.repo}/commit/main`
        const body = [
            JSON.stringify({
                key: 'header',
                value: { summary: commitMessage }
            }),
            JSON.stringify({
                key: 'lfsFile',
                value: {
                    path: filePath,
                    algo: 'sha256',
                    size: fileSize,
                    oid: oid
                }
            })
        ].join('\n')

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/x-ndjson'
            },
            body
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`HF Commit (LFS) failed: ${response.status} - ${error}`)
        }

        return await response.json()
    }

    private async commitDirectFile(filePath: string, file: Blob, commitMessage: string): Promise<any> {
        const url = `${this.uploadUrl}/api/datasets/${this.repo}/commit/main`
        const content = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())))
        const body = [
            JSON.stringify({
                key: 'header',
                value: { summary: commitMessage }
            }),
            JSON.stringify({
                key: 'file',
                value: {
                    path: filePath,
                    content,
                    encoding: 'base64'
                }
            })
        ].join('\n')

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/x-ndjson'
            },
            body
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`HF Commit (direct) failed: ${response.status} - ${error}`)
        }

        return await response.json()
    }

    private async logCommitDetails(commitOid: string, path: string, commitUrl?: string): Promise<void> {
        const apiCommitUrl = commitUrl
            ? commitUrl.replace('https://huggingface.co/datasets/', 'https://huggingface.co/api/datasets/')
            : `${this.baseUrl}/${this.repo}/commit/${commitOid}`
        const response = await fetch(apiCommitUrl, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
            }
        })
        const text = await response.text()
        console.log(`[HF] Commit info status: ${response.status}`)
        try {
            const info = JSON.parse(text)
            const files = info?.files || info?.changes || info?.siblings || []
            if (Array.isArray(files)) {
                const hasPath = files.some((f: any) => f?.path === path || f?.rfilename === path)
                console.log(`[HF] Commit files include path: ${hasPath}`)
            }
            console.log(`[HF] Commit info: ${JSON.stringify(info).slice(0, 2000)}`)
        } catch {
            console.log(`[HF] Commit info (raw): ${text.slice(0, 2000)}`)
        }
    }

    private async verifyFileExists(path: string): Promise<void> {
        const encodedPath = this.encodePathForUrl(path)
        const resolveUrl = `${this.resolveUrl}/${this.repo}/resolve/main/${encodedPath}`
        const rawUrl = `https://huggingface.co/datasets/${this.repo}/raw/main/${encodedPath}`
        const pathsInfoUrl = `${this.baseUrl}/${this.repo}/paths-info`

        let lastResolveStatus = 0
        let lastRawStatus = 0
        let lastPathsStatus = 0

        for (let i = 0; i < 10; i++) {
            const resolveResp = await fetch(resolveUrl, {
                method: 'HEAD',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                }
            })
            lastResolveStatus = resolveResp.status
            if (resolveResp.ok) {
                return
            }

            const rawResp = await fetch(rawUrl, {
                method: 'HEAD',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                }
            })
            lastRawStatus = rawResp.status
            if (rawResp.ok) {
                return
            }

            const pathsResp = await fetch(pathsInfoUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
                ,
                body: JSON.stringify({ paths: [path] })
            })
            lastPathsStatus = pathsResp.status
            if (pathsResp.ok) {
                try {
                    const pathsJson = await pathsResp.json() as Array<{ path?: string }>
                    const found = Array.isArray(pathsJson) && pathsJson.some(item => item.path === path || item.path === decodeURIComponent(encodedPath))
                    if (found) {
                        return
                    }
                } catch {
                    const pathsText = await pathsResp.text()
                    if (pathsText.includes(`"path":"${path}"`) || pathsText.includes(`"path":"${encodedPath}"`)) {
                        return
                    }
                }
            }

            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        throw new Error(`HF Verify failed: file not found after commit (${path}). resolveStatus=${lastResolveStatus}, rawStatus=${lastRawStatus}, pathsStatus=${lastPathsStatus}`)
    }

    async put(key: string, body: any, options: any): Promise<StorageResult> {
        const safeKey = key.replace(/^\//, '')
        console.log(`[HF] Uploading ${safeKey}, body type: ${body?.constructor?.name}`)

        const file = await this.bodyToBlob(body, options?.contentType)
        console.log(`[HF] File size: ${file.size}`)

        const sha256 = await this.sha256Hex(file)
        const sample = await this.getSampleBase64(file)

        const preuploadResult = await this.preupload(safeKey, file.size, sample)
        const fileInfo = preuploadResult?.files?.[0]
        const needsLfs = fileInfo?.uploadMode === 'lfs'

        if (needsLfs) {
            const batchResult = await this.lfsBatch(sha256, file.size)
            const obj = batchResult?.objects?.[0]
            if (obj?.error) {
                throw new Error(`HF LFS error: ${obj.error.message}`)
            }

            if (obj?.actions?.upload) {
                await this.uploadToLFS(obj.actions.upload, file, sha256)
            }

            const commitResult = await this.commitLfsFile(safeKey, sha256, file.size, `Upload ${safeKey}`)
            console.log(`[HF] Commit success: ${JSON.stringify(commitResult)}`)
            if (commitResult?.commitOid) {
                await this.logCommitDetails(commitResult.commitOid, safeKey, commitResult?.commitUrl)
            }
        } else {
            const commitResult = await this.commitDirectFile(safeKey, file, `Upload ${safeKey}`)
            console.log(`[HF] Commit success: ${JSON.stringify(commitResult)}`)
            if (commitResult?.commitOid) {
                await this.logCommitDetails(commitResult.commitOid, safeKey, commitResult?.commitUrl)
            }
        }

        await this.verifyFileExists(safeKey)

        return {
            key: safeKey,
            size: file.size
        }
    }

    async delete(key: string): Promise<void> {
        const url = `${this.baseUrl}/${this.repo}/discussions`
        // HF delete usually requires a commit or a specific API call to delete a file
        // Actually, deleting via API is via POST to /delete/main/PATH
        const delUrl = `${this.baseUrl}/${this.repo}/delete/main/${this.encodePathForUrl(key)}`
        const response = await fetch(delUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
            }
        })
        if (!response.ok && response.status !== 404) {
            const error = await response.text()
            throw new Error(`HF Delete failed: ${response.status} ${error}`)
        }
    }

    async get(key: string, options?: any): Promise<any> {
        const encoded = this.encodePathForUrl(key)
        const url = `${this.resolveUrl}/${this.repo}/resolve/main/${encoded}`
        const rawUrl = `https://huggingface.co/datasets/${this.repo}/raw/main/${encoded}`
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.token}`,
        }
        if (options?.range) {
            headers['Range'] = `bytes=${options.range.offset}-${options.range.offset + options.range.length - 1}`
        }

        let response = await fetch(url, { headers })
        if (!response.ok) {
            response = await fetch(rawUrl, { headers })
        }
        if (!response.ok) return null

        return {
            body: response.body,
            contentType: response.headers.get('content-type') || undefined,
            size: parseInt(response.headers.get('content-length') || '0'),
            metadata: {} // HF doesn't support custom metadata in the same way R2 does easily
        }
    }

    async head(key: string): Promise<any> {
        const encoded = this.encodePathForUrl(key)
        const url = `${this.resolveUrl}/${this.repo}/resolve/main/${encoded}`
        const rawUrl = `https://huggingface.co/datasets/${this.repo}/raw/main/${encoded}`
        let response = await fetch(url, {
            method: 'HEAD',
            headers: {
                'Authorization': `Bearer ${this.token}`,
            }
        })
        if (!response.ok) {
            response = await fetch(rawUrl, {
                method: 'HEAD',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                }
            })
        }
        if (!response.ok) return null

        return {
            size: parseInt(response.headers.get('content-length') || '0'),
            contentType: response.headers.get('content-type') || undefined,
            metadata: {}
        }
    }

    getPublicUrl(key: string): string {
        return `${this.appBaseUrl}/rest/${key}`
    }
}

export function getStorageProvider(c: any): StorageProvider {
    const storageType = c.env.STORAGE_TYPE || 'R2'
    if (storageType === 'HF' && c.env.HF_TOKEN && c.env.HF_REPO) {
        return new HFStorageProvider(c.env.HF_TOKEN, c.env.HF_REPO, c.env.BASE_URL)
    }
    return new R2StorageProvider(c.env.PICX, c.env.BASE_URL)
}

export function getProviderByType(c: any, type: 'R2' | 'HF'): StorageProvider {
    if (type === 'HF' && c.env.HF_TOKEN && c.env.HF_REPO) {
        return new HFStorageProvider(c.env.HF_TOKEN, c.env.HF_REPO, c.env.BASE_URL)
    }
    return new R2StorageProvider(c.env.PICX, c.env.BASE_URL)
}
