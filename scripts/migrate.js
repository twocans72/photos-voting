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
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Migration: add sort_order column if missing
try {
  const col = db.prepare("SELECT name FROM pragma_table_info('albums') WHERE name='sort_order'").get()
  if (!col) {
    db.exec(`ALTER TABLE albums ADD COLUMN sort_order INTEGER DEFAULT 0`)
    // Initialize sort_order based on current created_at order
    db.exec(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
        FROM albums
      )
      UPDATE albums SET sort_order = (SELECT rn FROM ranked WHERE ranked.id = albums.id)
    `)
    console.log('✅ Migrated albums: added sort_order column')
  }
} catch(e) {
  console.log('Migration sort_order skipped:', e.message)
}

// Migration: fix expires_at column if it's still TEXT type
try {
  const col = db.prepare("SELECT type FROM pragma_table_info('admin_sessions') WHERE name='expires_at'").get()
  if (col && col.type !== 'INTEGER') {
    db.exec(`
      DROP TABLE IF EXISTS admin_sessions_old;
      ALTER TABLE admin_sessions RENAME TO admin_sessions_old;
      CREATE TABLE admin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      DROP TABLE admin_sessions_old;
    `)
    console.log('✅ Migrated admin_sessions.expires_at to INTEGER')
  }
} catch(e) {
  console.log('Migration check skipped:', e.message)
}

// ── Umbau 2026-11: Konten, 4-Stufen-Stimmen, Favoriten, Benachrichtigungen ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    lang TEXT NOT NULL DEFAULT 'de',
    notify INTEGER NOT NULL DEFAULT 1,
    unsub_token TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_login INTEGER
  );
  CREATE TABLE IF NOT EXISTS login_tokens (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    lang TEXT,
    next TEXT,
    ip_hash TEXT,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    visitor TEXT,
    value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 4),
    ip_hash TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS ratings_user ON ratings(asset_id, user_id) WHERE user_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS ratings_visitor ON ratings(asset_id, visitor) WHERE user_id IS NULL;
  CREATE INDEX IF NOT EXISTS ratings_album ON ratings(album_id);
  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, asset_id)
  );
  CREATE TABLE IF NOT EXISTS album_assets (
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL,
    first_seen INTEGER NOT NULL,
    notified INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (album_id, asset_id)
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`)

function hasColumn(table, name) {
  return !!db.prepare(`SELECT name FROM pragma_table_info('${table}') WHERE name = ?`).get(name)
}

// announced: Album wurde schon per Mail angekündigt (oder war beim Umbau schon da).
if (!hasColumn('albums', 'announced')) {
  db.exec(`ALTER TABLE albums ADD COLUMN announced INTEGER DEFAULT 0`)
  db.exec(`UPDATE albums SET announced = 1 WHERE is_visible = 1`)
  console.log('✅ Migrated albums: added announced column')
}
// visible_at: Zeitpunkt, an dem das Album sichtbar geschaltet wurde (ms).
if (!hasColumn('albums', 'visible_at')) {
  db.exec(`ALTER TABLE albums ADD COLUMN visible_at INTEGER`)
  console.log('✅ Migrated albums: added visible_at column')
}

// lottery_end: letzter Tag der Verlosung (JJJJ-MM-TT) oder NULL für «ohne Datum».
if (!hasColumn('albums', 'lottery_end')) {
  db.exec(`ALTER TABLE albums ADD COLUMN lottery_end TEXT`)
  console.log('✅ Migrated albums: added lottery_end column')
}

// Einmalig beim Umbau: Das Bewerten ist neu in jedem Album offen. Die alten
// Zeitfenster gehörten zum Top-3-Wettbewerb und würden das neue Voting sperren.
if (!db.prepare(`SELECT value FROM settings WHERE key = 'ratings_v1'`).get()) {
  db.exec(`UPDATE albums SET voting_enabled = 1, voting_start = NULL, voting_end = NULL`)
  db.prepare(`INSERT INTO settings (key, value) VALUES ('ratings_v1', ?)`).run(String(Date.now()))
  console.log('✅ Ratings v1: voting opened for all albums, old time windows cleared')
}

console.log('✅ Database migrated:', dbPath)
db.close()
