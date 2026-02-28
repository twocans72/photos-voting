export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const albums = getDb().prepare(`SELECT id, immich_id, title, description, asset_count, cover_asset_id, voting_enabled, voting_start, voting_end, lottery_enabled FROM albums WHERE is_visible = 1 ORDER BY updated_at DESC`).all()
  return NextResponse.json(albums)
}
