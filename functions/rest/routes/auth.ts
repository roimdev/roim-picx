import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { Ok, Fail, FailCode } from '../type'
import StatusCode from '../type'
import type { AuthToken, User } from '../type'
import type { AppEnv } from '../middleware/auth'

const authRoutes = new Hono<AppEnv>()

// GitHub Login
authRoutes.post('/github/login', async (c) => {
    const { code } = await c.req.json<{ code: string }>()
    if (!code) return c.json(Fail("Missing code"))

    const clientId = c.env.GITHUB_CLIENT_ID
    const clientSecret = c.env.GITHUB_CLIENT_SECRET
    const owner = c.env.GITHUB_OWNER
    const authKey = c.env.PICX_AUTH_TOKEN

    if (!clientId || !clientSecret || !authKey) {
        return c.json(Fail("GitHub auth or System Token not configured"))
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

        // Create JWT Payload with User Info
        const userPayload: User = {
            id: userData.id,
            name: userData.name || userData.login,
            login: userData.login,
            avatar_url: userData.avatar_url
        }

        // Sign Token using System Auth Token as secret
        const token = await sign(userPayload, authKey, 'HS256')

        return c.json(Ok(token))
    } catch (e: any) {
        return c.json(Fail(e.message))
    }
})

// 检测token是否有效
authRoutes.post('/checkToken', async (c) => {
    const data = await c.req.json<AuthToken>()
    let token = data.token
    if (!token) {
        return c.json(Ok(false))
    }

    if (token.startsWith('Bearer ')) {
        token = token.substring(7)
    }

    const authKey = c.env.PICX_AUTH_TOKEN
    if (!authKey) {
        return c.json(Ok(false))
    }

    // 1. Check Static Token
    if (authKey === token) {
        return c.json(Ok(true))
    }

    // 2. Check JWT
    try {
        await verify(token, authKey, 'HS256')
        return c.json(Ok(true))
    } catch (e) {
        return c.json(Ok(false))
    }
})

export default authRoutes
