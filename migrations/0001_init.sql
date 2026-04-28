-- =============================================
-- roim-picx D1 Database Schema
-- Version: 0001_init
-- Description: Initial schema for user management, 
--              image metadata, statistics and audit logs
-- =============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id INTEGER UNIQUE,
    login TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    can_view_all INTEGER DEFAULT 0 CHECK (can_view_all IN (0, 1)),
    storage_quota INTEGER DEFAULT 1073741824,  -- 1GB default
    storage_used INTEGER DEFAULT 0,
    upload_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT
);

-- 图片元数据表
CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    user_login TEXT NOT NULL,
    original_name TEXT,
    size INTEGER DEFAULT 0,
    mime_type TEXT,
    folder TEXT DEFAULT '',
    tags TEXT,  -- JSON array
    is_public INTEGER DEFAULT 0 CHECK (is_public IN (0, 1)),
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 访问统计表
CREATE TABLE IF NOT EXISTS image_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_key TEXT NOT NULL,
    accessed_at TEXT DEFAULT (datetime('now')),
    referer TEXT,
    user_agent TEXT,
    country TEXT,
    city TEXT
);

-- 分享记录表
CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    image_key TEXT NOT NULL,
    user_id INTEGER,
    user_login TEXT,
    password_hash TEXT,
    max_views INTEGER,
    current_views INTEGER DEFAULT 0,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 操作审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_login TEXT,
    action TEXT NOT NULL CHECK (action IN ('upload', 'delete', 'rename', 'share', 'grant_permission', 'revoke_permission', 'login')),
    target_key TEXT,
    details TEXT,  -- JSON object
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- 索引
-- =============================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 图片表索引
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_user_login ON images(user_login);
CREATE INDEX IF NOT EXISTS idx_images_folder ON images(folder);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);

-- 访问统计索引
CREATE INDEX IF NOT EXISTS idx_image_stats_image_key ON image_stats(image_key);
CREATE INDEX IF NOT EXISTS idx_image_stats_accessed_at ON image_stats(accessed_at);

-- 分享表索引
CREATE INDEX IF NOT EXISTS idx_shares_image_key ON shares(image_key);
CREATE INDEX IF NOT EXISTS idx_shares_user_login ON shares(user_login);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_login ON audit_logs(user_login);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
