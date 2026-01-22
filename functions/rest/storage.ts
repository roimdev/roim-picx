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
    private resolveUrl = 'https://huggingface.co/datasets'

    constructor(private token: string, private repo: string, private appBaseUrl: string) { }

    async put(key: string, body: any, options: any): Promise<StorageResult> {
        // body could be ReadableStream, but HF API usually wants a Blob or buffer
        // For Cloudflare Workers, we can use fetch with the stream
        const url = `${this.baseUrl}/${this.repo}/upload/main/${key}`

        // HF API requires Content-Type: application/octet-stream for the upload itself?
        // Actually, HF upload API uses a specific format or simple PUT for single file
        // Let's use the Hub API style: PUT https://huggingface.co/api/datasets/REPO/upload/main/PATH

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
            },
            body: body // multipart is usually better but for single file POST works
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`HF Upload failed: ${response.status} ${error}`)
        }

        // We need the size. If body is ReadableStream, we might not have it easily unless passed in options
        // For now, let's assume we can get it from the response or options
        // In roim-picx, the size is available in the File object before stream()

        return {
            key,
            size: 0 // Will be updated by caller if needed, or we fetch head
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
