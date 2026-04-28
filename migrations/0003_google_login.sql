-- Add google_id column to users table for Google OAuth login
ALTER TABLE users ADD COLUMN google_id TEXT;

-- Create index for google_id lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
