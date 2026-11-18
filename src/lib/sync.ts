import { getDb } from './db'
import { extendLotteries } from './lottery'
import { getAlbums, getAlbumAssets } from './immich'
import { digestMail, DigestItem, mailConfigured, sendMail } from './mail'

const MIN = 60 * 1000
const QUIET_PERIOD = 60 * MIN // so lange muss Ruhe sein, bevor Neues verschickt wird
const MIN_GAP = 20 * 60 * MIN // höchstens eine Sammelmail pro Tag

/** Albumliste aus Immich übernehmen. Neue Alben sind unsichtbar, aber bewertbar. */
export async function syncAlbums(): Promise<number> {
  const albums = await getAlbums()
  const db = getDb()
  const upsert = db.prepare(`
    INSERT INTO albums (immich_id, title, description, asset_count, cover_asset_id, voting_enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(immich_id) DO UPDATE SET
      title=excluded.title,
      description=excluded.description,
      asset_count=excluded.asset_count,
      cover_asset_id=excluded.cover_asset_id,
      updated_at=CURRENT_TIMESTAMP
  `)
  const tx = db.transaction(() => {
    for (const a of albums) upsert.run(a.id, a.albumName, a.description || null, a.assetCount, a.albumThumbnailAssetId || null)
  })
  tx()
  return albums.length
}

/**
 * Hält fest, welche Bilder ein Album enthält. Der erste Stand eines Albums ist
 * die Ausgangslage (first_seen = 0, gilt als gemeldet); alles, was später
 * dazukommt, ist «neu» und landet in der nächsten Sammelmail.
 */
export function recordAssets(albumId: number, assetIds: string[]): number {
  if (assetIds.length === 0) return 0
  const db = getDb()
  const have = new Set(
    (db.prepare('SELECT asset_id FROM album_assets WHERE album_id = ?').all(albumId) as { asset_id: string }[]).map((r) => r.asset_id)
  )
  const baseline = have.size === 0
  const now = Date.now()
  const insert = db.prepare('INSERT OR IGNORE INTO album_assets (album_id, asset_id, first_seen, notified) VALUES (?, ?, ?, ?)')
  const remove = db.prepare('DELETE FROM album_assets WHERE album_id = ? AND asset_id = ?')
  const wanted = new Set(assetIds)
  let added = 0
  const tx = db.transaction(() => {
    for (const id of assetIds) {
      if (!have.has(id)) {
        insert.run(albumId, id, baseline ? 0 : now, baseline ? 1 : 0)
        added++
      }
    }
    for (const id of Array.from(have)) if (!wanted.has(id)) remove.run(albumId, id)
  })
  tx()
  return baseline ? 0 : added
}

async function syncVisibleAssets(): Promise<void> {
  const db = getDb()
  const albums = db.prepare('SELECT id, immich_id FROM albums WHERE is_visible = 1').all() as { id: number; immich_id: string }[]
  for (const album of albums) {
    try {
      const assets = await getAlbumAssets(album.immich_id, false)
      recordAssets(album.id, assets.filter((a) => a.type === 'IMAGE').map((a) => a.id))
    } catch (err) {
      console.error(`[sync] Album ${album.id}: Bilder konnten nicht gelesen werden:`, err)
    }
  }
}

function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row ? row.value : null
}

function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

interface PendingAlbum {
  id: number
  title: string
  cover_asset_id: string | null
  asset_count: number
  visible_at: number | null
}
interface PendingAssets {
  id: number
  title: string
  cover_asset_id: string | null
  n: number
  latest: number
}

/** Verschickt die Sammelmail, wenn es Neues gibt, Ruhe eingekehrt ist und die letzte Mail lange genug her ist. */
async function maybeSendDigest(): Promise<string> {
  const db = getDb()
  const now = Date.now()
  const newAlbums = db
    .prepare('SELECT id, title, cover_asset_id, asset_count, visible_at FROM albums WHERE is_visible = 1 AND COALESCE(announced, 0) = 0')
    .all() as PendingAlbum[]
  const newAssets = db
    .prepare(
      `SELECT a.id, a.title, a.cover_asset_id, COUNT(*) AS n, MAX(aa.first_seen) AS latest
       FROM album_assets aa JOIN albums a ON a.id = aa.album_id
       WHERE aa.notified = 0 AND a.is_visible = 1 AND COALESCE(a.announced, 0) = 1
       GROUP BY a.id`
    )
    .all() as PendingAssets[]
  if (newAlbums.length === 0 && newAssets.length === 0) return 'nothing-new'

  const latest = Math.max(0, ...newAlbums.map((a) => a.visible_at || 0), ...newAssets.map((a) => a.latest || 0))
  if (now - latest < QUIET_PERIOD) return 'waiting-for-quiet'
  const last = parseInt(getSetting('last_digest_at') || '0', 10)
  if (now - last < MIN_GAP) return 'waiting-for-gap'

  const items: DigestItem[] = [
    ...newAlbums.map((a) => ({ albumId: a.id, title: a.title, coverAssetId: a.cover_asset_id, isNewAlbum: true, count: a.asset_count })),
    ...newAssets.map((a) => ({ albumId: a.id, title: a.title, coverAssetId: a.cover_asset_id, isNewAlbum: false, count: a.n })),
  ]
  const recipients = db.prepare('SELECT email, lang, unsub_token FROM users WHERE notify = 1').all() as {
    email: string
    lang: 'de' | 'en'
    unsub_token: string
  }[]

  let sent = 0
  if (recipients.length > 0) {
    if (!mailConfigured()) return 'smtp-not-configured'
    for (const r of recipients) {
      const mail = digestMail(r.lang === 'en' ? 'en' : 'de', items, r.unsub_token)
      if (await sendMail({ to: r.email, ...mail })) sent++
    }
    if (sent === 0) return 'all-sends-failed'
  }

  const ids = items.map((i) => i.albumId)
  const tx = db.transaction(() => {
    for (const id of ids) {
      db.prepare('UPDATE albums SET announced = 1 WHERE id = ?').run(id)
      db.prepare('UPDATE album_assets SET notified = 1 WHERE album_id = ?').run(id)
    }
  })
  tx()
  if (sent > 0) setSetting('last_digest_at', String(now))
  return `sent-${sent}`
}

let running = false

/** Ein Durchlauf des Hintergrund-Jobs: Immich abgleichen, dann evtl. Sammelmail. */
export async function runTick(): Promise<{ albums: number; digest: string } | { skipped: true }> {
  if (running) return { skipped: true }
  running = true
  try {
    try {
      extendLotteries()
    } catch (err) {
      console.error('[lottery] Verlängern fehlgeschlagen:', err)
    }
    const albums = await syncAlbums()
    await syncVisibleAssets()
    const digest = await maybeSendDigest()
    return { albums, digest }
  } finally {
    running = false
  }
}
