export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { cookieOptions, COOKIE_NAMES, getUser, getVisitor, ipHash, randomToken } from '@/lib/users'
import { getVotingStatus } from '@/types'
import { publicLottery } from '@/lib/lottery'
import type { Album } from '@/types'

function loadAlbum(id: string): Album | undefined {
  return getDb().prepare('SELECT * FROM albums WHERE id = ? AND is_visible = 1').get(id) as Album | undefined
}

/** Album-Kopf, eigene Stimmen und Favoriten sowie die Verteilung aller Stimmen. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const album = loadAlbum(params.id)
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const db = getDb()
  const user = getUser()
  const visitor = getVisitor()

  const all: Record<string, [number, number, number, number]> = {}
  const rows = db.prepare('SELECT asset_id, value, COUNT(*) AS c FROM ratings WHERE album_id = ? GROUP BY asset_id, value').all(album.id) as {
    asset_id: string
    value: number
    c: number
  }[]
  let total = 0
  for (const r of rows) {
    if (!all[r.asset_id]) all[r.asset_id] = [0, 0, 0, 0]
    all[r.asset_id][r.value - 1] = r.c
    total += r.c
  }

  const mine: Record<string, number> = {}
  const mineRows = user
    ? (db.prepare('SELECT asset_id, value FROM ratings WHERE album_id = ? AND user_id = ?').all(album.id, user.id) as { asset_id: string; value: number }[])
    : visitor
      ? (db.prepare('SELECT asset_id, value FROM ratings WHERE album_id = ? AND user_id IS NULL AND visitor = ?').all(album.id, visitor) as {
          asset_id: string
          value: number
        }[])
      : []
  for (const r of mineRows) mine[r.asset_id] = r.value

  const favs = user
    ? (db.prepare('SELECT asset_id FROM favorites WHERE album_id = ? AND user_id = ?').all(album.id, user.id) as { asset_id: string }[]).map((r) => r.asset_id)
    : []

  const lottery = publicLottery(album)
  return NextResponse.json({
    album: {
      id: album.id,
      title: album.title,
      description: album.description,
      asset_count: album.asset_count,
      lottery: !!lottery,
      lotteryUntil: lottery ? lottery.until : null,
      open: getVotingStatus(album).isOpen,
    },
    mine,
    favs,
    all,
    total,
  })
}

/** Stimme setzen (1–4) oder mit 0 zurücknehmen. Ohne Konto zählt ein Cookie pro Gerät. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const album = loadAlbum(params.id)
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!getVotingStatus(album).isOpen) return NextResponse.json({ error: 'closed' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const assetId = String(body.assetId || '')
  const value = Number(body.value)
  if (!Number.isInteger(value) || value < 0 || value > 4) return NextResponse.json({ error: 'invalid_value' }, { status: 400 })

  const db = getDb()
  if (!db.prepare('SELECT 1 FROM album_assets WHERE album_id = ? AND asset_id = ?').get(album.id, assetId)) {
    return NextResponse.json({ error: 'unknown_asset' }, { status: 400 })
  }

  const now = Date.now()
  const ip = ipHash(request.headers)
  const burst = (db.prepare('SELECT COUNT(*) AS c FROM ratings WHERE ip_hash = ? AND updated_at > ?').get(ip, now - 60 * 1000) as { c: number }).c
  if (burst > 150) return NextResponse.json({ error: 'too_fast' }, { status: 429 })

  const user = getUser()
  let visitor = getVisitor()
  let newVisitor = false

  if (user) {
    if (value === 0) {
      db.prepare('DELETE FROM ratings WHERE asset_id = ? AND user_id = ?').run(assetId, user.id)
    } else {
      db.prepare(
        `INSERT INTO ratings (album_id, asset_id, user_id, value, ip_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(asset_id, user_id) WHERE user_id IS NOT NULL DO UPDATE SET value = excluded.value, ip_hash = excluded.ip_hash, updated_at = excluded.updated_at`
      ).run(album.id, assetId, user.id, value, ip, now, now)
    }
  } else {
    if (!visitor) {
      visitor = randomToken(16)
      newVisitor = true
    }
    if (value === 0) {
      db.prepare('DELETE FROM ratings WHERE asset_id = ? AND user_id IS NULL AND visitor = ?').run(assetId, visitor)
    } else {
      // Gelöschte Cookies sollen keine Stimmenflut erlauben: pro Bild und Anschluss
      // zählen höchstens fünf verschiedene anonyme Geräte.
      const others = (
        db.prepare('SELECT COUNT(*) AS c FROM ratings WHERE asset_id = ? AND user_id IS NULL AND ip_hash = ? AND visitor != ?').get(assetId, ip, visitor) as {
          c: number
        }
      ).c
      if (others >= 5) return NextResponse.json({ error: 'too_many_devices' }, { status: 429 })
      db.prepare(
        `INSERT INTO ratings (album_id, asset_id, visitor, value, ip_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(asset_id, visitor) WHERE user_id IS NULL DO UPDATE SET value = excluded.value, ip_hash = excluded.ip_hash, updated_at = excluded.updated_at`
      ).run(album.id, assetId, visitor, value, ip, now, now)
    }
  }

  const response = NextResponse.json({ ok: true, value })
  if (newVisitor && visitor) response.cookies.set(COOKIE_NAMES.visitor, visitor, cookieOptions(365))
  return response
}
