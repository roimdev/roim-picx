import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { Fail } from './type'
import type { AppEnv } from './middleware/auth'

// Import route modules
import authRoutes from './routes/auth'
import uploadRoutes from './routes/upload'
import imageRoutes from './routes/images'
import folderRoutes from './routes/folders'
import shareRoutes from './routes/share'

const app = new Hono<AppEnv>().basePath('/rest')

// Register route modules
app.route('/', authRoutes)
app.route('/', uploadRoutes)
app.route('/', folderRoutes)
app.route('/', shareRoutes)
app.route('/', imageRoutes) // Must be last due to catch-all route

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
export type { AppEnv as Bindings }
