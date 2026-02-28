const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'voting.db')
const dbDir = path.dirname(dbPath)

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    immich_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    asset_count INTEGER DEFAULT 0,
    cover_asset_id TEXT,
    is_visible INTEGER DEFAULT 0,
    voting_enabled INTEGER DEFAULT 0,
    voting_start DATETIME,
    voting_end DATETIME,
    lottery_enabled INTEGER DEFAULT 0,
    lottery_drawn INTEGER DEFAULT 0,
    lottery_winner_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    rank1_asset_id TEXT NOT NULL,
    rank2_asset_id TEXT,
    rank3_asset_id TEXT,
    email TEXT,
    name TEXT,
    ip_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album_id, session_token)
  );
  CREATE TABLE IF NOT EXISTS lottery_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    vote_id INTEGER NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    is_winner INTEGER DEFAULT 0,
    notified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album_id, email)
  );
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

console.log('✅ Database migrated:', dbPath)
db.close()
