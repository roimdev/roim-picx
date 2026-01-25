-- =============================================
-- roim-picx D1 Database Schema
-- Version: 0006_system_settings
-- Description: Add system settings table for dynamic configuration
-- =============================================

CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL, -- JSON string
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default upload config (migrated from utils.ts)
INSERT OR IGNORE INTO system_settings (key, value, description) 
VALUES (
    'upload_config', 
    '[{"type":"image/png","ext":"png"},{"type":"image/jpeg","ext":"jpeg"},{"type":"image/gif","ext":"gif"},{"type":"image/webp","ext":"webp"},{"type":"image/jpg","ext":"jpg"},{"type":"image/x-icon","ext":"ico"},{"type":"application/x-ico","ext":"ico"},{"type":"image/vnd.microsoft.icon","ext":"ico"}]',
    'Supported upload file types and extensions'
);
