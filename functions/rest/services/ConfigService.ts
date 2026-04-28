import { D1Database } from "@cloudflare/workers-types";

export interface UploadConfigItem {
    type: string;
    ext: string;
}

// In-memory cache for upload config
let uploadConfigCache: UploadConfigItem[] | null = null;
let tokenExpireCache: number | null = null;

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
                uploadConfigCache = [];
            }
        } else {
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

    async getTokenExpireDays(): Promise<number> {
        if (tokenExpireCache !== null) {
            return tokenExpireCache;
        }

        const result = await this.db.prepare(
            `SELECT value FROM system_settings WHERE key = 'token_expire_days'`
        ).first<string>('value');

        if (result) {
            const days = parseInt(result, 10);
            if (!isNaN(days) && days > 0) {
                tokenExpireCache = days;
                return days;
            }
        }

        // Default to 7 days
        tokenExpireCache = 7;
        return 7;
    }

    async updateTokenExpireDays(days: number): Promise<boolean> {
        if (days <= 0) return false;

        const result = await this.db.prepare(
            `INSERT INTO system_settings (key, value, description) 
             VALUES ('token_expire_days', ?, 'Token expiration in days')
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
        ).bind(String(days)).run();

        if (result.success) {
            tokenExpireCache = days;
            return true;
        }
        return false;
    }
}
