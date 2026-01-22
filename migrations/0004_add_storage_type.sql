-- Add storage_type column to images table
ALTER TABLE images ADD COLUMN storage_type TEXT DEFAULT 'R2' CHECK (storage_type IN ('R2', 'HF'));

-- Add storage_type to audit_logs details if needed, but details is already JSON
-- No changes needed for audit_logs
