export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

const FRESH_DAYS = 14

export async function GET() {
  const since = Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000
  const albums = getDb()
    .prepare(
      `SELECT a.id, a.title, a.description, a.asset_count, a.cover_asset_id, a.lottery_enabled, a.lottery_drawn,
        (SELECT COUNT(*) FROM ratings r WHERE r.album_id = a.id) AS rating_count,
        (COALESCE(a.visible_at, 0) > ? OR EXISTS (SELECT 1 FROM album_assets aa WHERE aa.album_id = a.id AND aa.first_seen > ?)) AS is_fresh
       FROM albums a WHERE a.is_visible = 1 ORDER BY a.sort_order ASC, a.created_at ASC`
    )
    .all(since, since)
  return NextResponse.json(albums)
}
