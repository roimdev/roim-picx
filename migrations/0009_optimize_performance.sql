-- Add index on images(original_name) to speed up filename searches
CREATE INDEX IF NOT EXISTS idx_images_original_name ON images(original_name);
