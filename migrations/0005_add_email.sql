-- Add email column to users table for Google login email storage
ALTER TABLE users ADD COLUMN email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
