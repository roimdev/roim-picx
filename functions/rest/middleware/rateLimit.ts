import { Context, Next } from 'hono'
import { Fail } from '../type'
import type { AppEnv } from './auth'

export interface RateLimitConfig {
    /** Maximum requests allowed in the time window */
    limit: number
    /** Time window in seconds */
    windowSeconds: number
    /** Key prefix for KV storage */
    keyPrefix: string
}

const defaultConfig: RateLimitConfig = {
    limit: 60,
    windowSeconds: 60,
    keyPrefix: 'rate'
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
    upload: { limit: 10, windowSeconds: 60, keyPrefix: 'rate:upload' },
    list: { limit: 30, windowSeconds: 60, keyPrefix: 'rate:list' },
    default: { limit: 60, windowSeconds: 60, keyPrefix: 'rate:default' }
}

/**
 * Get client IP from Cloudflare headers
 */
const getClientIP = (c: Context<AppEnv>): string => {
    return c.req.header('cf-connecting-ip') ||
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
        'unknown'
}

/**
 * Rate limiting middleware factory (Original KV implementation)
 * Uses Cloudflare KV to store request counts with TTL
 * @deprecated Use memory based rateLimit instead to save KV operations
 */
export const rateLimitKV = (config: Partial<RateLimitConfig> = {}) => {
    const { limit, windowSeconds, keyPrefix } = { ...defaultConfig, ...config }

    return async (c: Context<AppEnv>, next: Next) => {
        const ip = getClientIP(c)
        const key = `${keyPrefix}:${ip}`

        try {
            // Get current count from KV
            const currentCount = await c.env.XK.get(key)
            const count = currentCount ? parseInt(currentCount, 10) : 0

            if (count >= limit) {
                // Rate limit exceeded
                return c.json(
                    Fail(`请求过于频繁，请 ${windowSeconds} 秒后再试`),
                    429
                )
            }

            // Increment counter with TTL
            await c.env.XK.put(key, String(count + 1), {
                expirationTtl: windowSeconds
            })

            // Add rate limit headers
            c.header('X-RateLimit-Limit', String(limit))
            c.header('X-RateLimit-Remaining', String(limit - count - 1))
            c.header('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + windowSeconds))

            await next()
        } catch (e) {
            // If KV fails, log and allow request to proceed
            console.error('Rate limit error:', e)
            await next()
        }
    }
}

// In-memory storage for rate limiting
const memoryStore = new Map<string, { count: number, resetTime: number }>()

// Cleanup expired entries occasionally to prevent memory leaks
const cleanupMemoryStore = () => {
    const now = Date.now()
    for (const [key, value] of memoryStore.entries()) {
        if (value.resetTime < now) {
            memoryStore.delete(key)
        }
    }
}

/**
 * Rate limiting middleware factory
 * Uses in-memory Map to store request counts
 * Note: This limit is per-isolate (worker instance), not global.
 */
export const rateLimit = (config: Partial<RateLimitConfig> = {}) => {
    const { limit, windowSeconds, keyPrefix } = { ...defaultConfig, ...config }

    return async (c: Context<AppEnv>, next: Next) => {
        const ip = getClientIP(c)
        const url = new URL(c.req.url)
        const key = `${keyPrefix}:${url.pathname}:${ip}`
        const now = Date.now()

        // Probabilistic cleanup (1% chance per request)
        if (Math.random() < 0.01) {
            cleanupMemoryStore()
        }

        let record = memoryStore.get(key)

        // Check for expiration
        if (record && record.resetTime < now) {
            memoryStore.delete(key)
            record = undefined
        }

        if (!record) {
            record = {
                count: 0,
                resetTime: now + windowSeconds * 1000
            }
            memoryStore.set(key, record)
        }

        if (record.count >= limit) {
            return c.json(
                Fail(`请求过于频繁，请 ${windowSeconds} 秒后再试`),
                429
            )
        }

        // Increment count
        record.count++
        // Reset expiration window on activity (matching original KV logic which set TTL on every put)
        record.resetTime = now + windowSeconds * 1000

        // Add rate limit headers
        c.header('X-RateLimit-Limit', String(limit))
        c.header('X-RateLimit-Remaining', String(Math.max(0, limit - record.count)))
        c.header('X-RateLimit-Reset', String(Math.floor(record.resetTime / 1000)))

        await next()
    }
}

/**
 * Rate limiter for upload endpoints
 */
export const uploadRateLimit = rateLimit(rateLimitConfigs.upload)

/**
 * Rate limiter for list endpoints
 */
export const listRateLimit = rateLimit(rateLimitConfigs.list)
