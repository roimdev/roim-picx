-- Add NSFW columns to images table
ALTER TABLE images ADD COLUMN nsfw INTEGER DEFAULT 0 CHECK (nsfw IN (0, 1));
ALTER TABLE images ADD COLUMN nsfw_score REAL DEFAULT 0;
