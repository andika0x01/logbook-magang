PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS log_versions;
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Logs Table (Day-based, partitioned by user)
CREATE TABLE logs (
    date TEXT NOT NULL, -- Format: YYYY-MM-DD
    user_id TEXT NOT NULL,
    content TEXT,
    media_url TEXT,
    last_editor_id TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (last_editor_id) REFERENCES users(id)
);
