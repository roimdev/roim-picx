import { Hono } from 'hono'
import { Ok, Fail, ApiKey, User } from '../type'
import { auth, type AppEnv } from '../middleware/auth'

const apiKeyRoutes = new Hono<AppEnv>()

// List all API keys for current user
apiKeyRoutes.get('/api-keys', auth, async (c) => {
    const user = c.get('user') as User | undefined
    if (!user) return c.json(Fail('Not authenticated'), 401)

    try {
        const result = await c.env.DB.prepare(
            'SELECT id, name, key_prefix, created_at, last_used_at, expires_at, is_active FROM api_keys WHERE user_login = ? ORDER BY created_at DESC'
        ).bind(user.login).all<ApiKey>()

        return c.json(Ok(result.results || []))
    } catch (e) {
        return c.json(Fail(`Failed to list API keys: ${(e as Error).message}`))
    }
})

// Create a new API key
apiKeyRoutes.post('/api-keys', auth, async (c) => {
    const user = c.get('user') as User | undefined
    if (!user) return c.json(Fail('Not authenticated'), 401)

    try {
        const { name, expires_at } = await c.req.json<{ name: string, expires_at?: string }>()
        if (!name) return c.json(Fail('Name is required'))

        // Generate a random key
        const prefix = Math.random().toString(36).substring(2, 10)
        const secret = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
        const fullKey = `px_${prefix}.${secret}`

        // Hash the secret
        const encoder = new TextEncoder()
        const data = encoder.encode(secret)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        const id = crypto.randomUUID()

        await c.env.DB.prepare(
            `INSERT INTO api_keys (id, user_id, user_login, key_prefix, key_hash, name, expires_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, user.id, user.login, prefix, hashHex, name, expires_at || null).run()

        return c.json(Ok({
            id,
            name,
            key: fullKey, // ONLY return once
            expires_at: expires_at || null,
            created_at: new Date().toISOString()
        }))
    } catch (e) {
        return c.json(Fail(`Failed to create API key: ${(e as Error).message}`))
    }
})

// Revoke an API key
apiKeyRoutes.delete('/api-keys/:id', auth, async (c) => {
    const user = c.get('user') as User | undefined
    if (!user) return c.json(Fail('Not authenticated'), 401)

    const id = c.req.param('id')

    try {
        // Ensure the key belongs to the user
        const key = await c.env.DB.prepare('SELECT user_login FROM api_keys WHERE id = ?').bind(id).first<{ user_login: string }>()

        if (!key) return c.json(Fail('Key not found'), 404)
        if (key.user_login !== user.login && user.role !== 'admin') {
            return c.json(Fail('Permission denied'), 403)
        }

        await c.env.DB.prepare('DELETE FROM api_keys WHERE id = ?').bind(id).run()
        return c.json(Ok({ id }))
    } catch (e) {
        return c.json(Fail(`Failed to revoke API key: ${(e as Error).message}`))
    }
})

export default apiKeyRoutes
