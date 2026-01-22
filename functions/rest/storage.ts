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

    async put(key: string, body: any, options: any): Promise<StorageResult> {
        // The HF Hub API now requires using the commit endpoint
        // We need to first upload the file content, then create a commit

        // Convert ReadableStream to ArrayBuffer if needed
        let fileContent: ArrayBuffer
        if (body instanceof ReadableStream) {
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
            fileContent = combined.buffer
        } else if (body instanceof ArrayBuffer) {
            fileContent = body
        } else if (typeof body === 'string') {
            fileContent = new TextEncoder().encode(body).buffer
        } else {
            fileContent = body
        }

        // Use the HF Hub commit API directly
        // POST /api/datasets/{repo}/commit/main
        const commitUrl = `${this.baseUrl}/${this.repo}/commit/main`

        // Encode content to Base64
        const uint8Array = new Uint8Array(fileContent)
        let binary = ''
        const len = uint8Array.byteLength
        // Process in chunks to avoid stack overflow with String.fromCharCode
        for (let i = 0; i < len; i += 32768) {
            binary += String.fromCharCode.apply(null, Array.from(uint8Array.subarray(i, Math.min(i + 32768, len))))
        }
        const base64Content = btoa(binary)

        const commitPayload = {
            summary: `Upload ${key}`,
            operations: [{
                operation: 'add',
                path: key,
                content: base64Content,
                encoding: 'base64'
            }]
        }

        const commitResponse = await fetch(commitUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commitPayload)
        })

        if (!commitResponse.ok) {
            const commitError = await commitResponse.text()
            throw new Error(`HF Commit failed: ${commitResponse.status} ${commitError}`)
        }

        return {
            key,
            size: fileContent.byteLength
        }
    }

    async delete(key: string): Promise<void> {
        const url = `${this.baseUrl}/${this.repo}/discussions`
        // HF delete usually requires a commit or a specific API call to delete a file
        // Actually, deleting via API is via POST to /delete/main/PATH
        const delUrl = `${this.baseUrl}/${this.repo}/delete/main/${key}`
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
        const url = `${this.resolveUrl}/${this.repo}/resolve/main/${key}`
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.token}`,
        }
        if (options?.range) {
            headers['Range'] = `bytes=${options.range.offset}-${options.range.offset + options.range.length - 1}`
        }

        const response = await fetch(url, { headers })
        if (!response.ok) return null

        return {
            body: response.body,
            contentType: response.headers.get('content-type') || undefined,
            size: parseInt(response.headers.get('content-length') || '0'),
            metadata: {} // HF doesn't support custom metadata in the same way R2 does easily
        }
    }

    async head(key: string): Promise<any> {
        const url = `${this.resolveUrl}/${this.repo}/resolve/main/${key}`
        const response = await fetch(url, {
            method: 'HEAD',
            headers: {
                'Authorization': `Bearer ${this.token}`,
            }
        })
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
