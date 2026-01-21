-- Add steam_id column to users table for Steam login support
ALTER TABLE users ADD COLUMN steam_id TEXT;
CREATE INDEX idx_users_steam_id ON users(steam_id);
