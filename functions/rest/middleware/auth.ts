import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import { FailCode, NotAuth, Fail } from '../type'
import StatusCode from '../type'
import type { User } from '../type'

export type Bindings = {
    BASE_URL: string
    XK: KVNamespace
    PICX: R2Bucket
    PICX_AUTH_TOKEN: string
    GITHUB_CLIENT_ID: string
    GITHUB_CLIENT_SECRET: string
    GITHUB_OWNER: string
}

export type Variables = {
    user?: User
}

export type AppEnv = { Bindings: Bindings; Variables: Variables }

/**
 * Auth middleware for non-GET/OPTIONS requests
 * Validates Admin Token or JWT Token
 */
export const auth = async (c: Context<AppEnv>, next: Next) => {
    const method = c.req.method
    if (method === "GET" || method === "OPTIONS" || c.req.path.startsWith('/rest/github/login')) {
        await next()
        return
    }

    // get user token
    let token = c.req.header('Authorization')
    if (!token) {
        return c.json(NotAuth())
    }

    // Fix Bearer prefix if present
    if (token.startsWith('Bearer ')) {
        token = token.substring(7)
    }

    const authKey = c.env.PICX_AUTH_TOKEN
    if (!authKey) {
        return c.json(Fail("system not auth setting"))
    }

    // 1. Check if it's the system Admin Token
    if (token === authKey) {
        // Admin access, proceed without specific user info or set as admin
        await next()
        return
    }

    // 2. Try to verify as JWT
    try {
        const payload = await verify(token, authKey, 'HS256')
        // Store user info in context
        c.set('user', payload as User)
        await next()
    } catch (e) {
        // Both checks failed
        console.error(`Auth failed: ${(e as Error).message}`)
        return c.json(FailCode(`auth fail: ${(e as Error).message}`, StatusCode.NotAuth))
    }
}
