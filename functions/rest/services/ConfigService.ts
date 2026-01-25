import { D1Database } from "@cloudflare/workers-types";

export interface UploadConfigItem {
    type: string;
    ext: string;
}

// In-memory cache for upload config
let uploadConfigCache: UploadConfigItem[] | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 60 * 1000; // 1 minute local cache TTL to ensure somewhat fresh data if multiple isolates
// However, the requirement says "update automatically loads into worker memory", 
// which implies we might want to refresh it immediately on update or have a long TTL and manual refresh.
// For now, simple caching strategy:
// 1. Read from DB if cache is null.
// 2. On update, update DB and cache.

export class ConfigService {
    private db: D1Database;

    constructor(db: D1Database) {
        this.db = db;
    }

    async getUploadConfig(): Promise<UploadConfigItem[]> {
        // Return cache if available
        if (uploadConfigCache) {
            return uploadConfigCache;
        }

        // Fetch from DB
        const result = await this.db.prepare(
            `SELECT value FROM system_settings WHERE key = 'upload_config'`
        ).first<string>('value');

        if (result) {
            try {
                uploadConfigCache = JSON.parse(result);
            } catch (e) {
                console.error('Failed to parse upload_config:', e);
                // Fallback to empty or default? Let's return empty to be safe or maybe the caller handles it.
                // But better to have a fallback if DB is corrupted.
                uploadConfigCache = [];
            }
        } else {
            // If not in DB, return empty or default?
            // Maybe we should insert default if missing? 
            // For now, return empty array if not found (migration should have inserted it)
            uploadConfigCache = [];
        }

        return uploadConfigCache || [];
    }

    async updateUploadConfig(config: UploadConfigItem[]): Promise<boolean> {
        const jsonStr = JSON.stringify(config);

        const result = await this.db.prepare(
            `INSERT INTO system_settings (key, value, description) 
             VALUES ('upload_config', ?, 'Supported upload file types')
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
        ).bind(jsonStr).run();

        if (result.success) {
            // Update cache
            uploadConfigCache = config;
            return true;
        }
        return false;
    }
}
