export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getUser, ipHash } from '@/lib/users'

/** Alle Favoriten des Kontos, über alle sichtbaren Alben. */
export async function GET() {
  const user = getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const rows = getDb()
    .prepare(
      `SELECT f.asset_id, f.album_id, a.title AS album_title, r.value
       FROM favorites f JOIN albums a ON a.id = f.album_id
       LEFT JOIN ratings r ON r.asset_id = f.asset_id AND r.user_id = f.user_id
       WHERE f.user_id = ? AND a.is_visible = 1
       ORDER BY a.sort_order ASC, f.created_at DESC`
    )
    .all(user.id)
  return NextResponse.json(rows)
}

/** Favorit setzen oder entfernen. Ein Herz auf einem unbewerteten Bild setzt «Love it». */
export async function POST(request: NextRequest) {
  const user = getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const assetId = String(body.assetId || '')
  const albumId = Number(body.albumId)
  const on = !!body.on
  const db = getDb()
  if (!db.prepare('SELECT 1 FROM album_assets aa JOIN albums a ON a.id = aa.album_id WHERE aa.album_id = ? AND aa.asset_id = ? AND a.is_visible = 1').get(albumId, assetId)) {
    return NextResponse.json({ error: 'unknown_asset' }, { status: 400 })
  }
  const now = Date.now()
  let rating: number | null = null
  if (on) {
    db.prepare('INSERT OR IGNORE INTO favorites (user_id, album_id, asset_id, created_at) VALUES (?, ?, ?, ?)').run(user.id, albumId, assetId, now)
    const existing = db.prepare('SELECT value FROM ratings WHERE asset_id = ? AND user_id = ?').get(assetId, user.id) as { value: number } | undefined
    if (!existing) {
      db.prepare('INSERT INTO ratings (album_id, asset_id, user_id, value, ip_hash, created_at, updated_at) VALUES (?, ?, ?, 4, ?, ?, ?)').run(
        albumId,
        assetId,
        user.id,
        ipHash(request.headers),
        now,
        now
      )
      rating = 4
    }
  } else {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND asset_id = ?').run(user.id, assetId)
  }
  return NextResponse.json({ ok: true, on, rating })
}
