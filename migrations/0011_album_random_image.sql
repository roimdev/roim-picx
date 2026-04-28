-- Add enable_random_image to albums table
ALTER TABLE albums ADD COLUMN enable_random_image INTEGER DEFAULT 0;
