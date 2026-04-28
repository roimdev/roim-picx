-- Albums table
CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Album images link table
CREATE TABLE IF NOT EXISTS album_images (
    album_id INTEGER NOT NULL,
    image_key TEXT NOT NULL,
    image_url TEXT,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (album_id, image_key),
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

-- Album shares table
CREATE TABLE IF NOT EXISTS album_shares (
    id TEXT PRIMARY KEY,
    album_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    user_login TEXT NOT NULL,
    password_hash TEXT,
    max_views INTEGER,
    current_views INTEGER DEFAULT 0,
    expires_at TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_albums_user_id ON albums(user_id);
CREATE INDEX IF NOT EXISTS idx_album_images_album_id ON album_images(album_id);
CREATE INDEX IF NOT EXISTS idx_album_shares_album_id ON album_shares(album_id);
