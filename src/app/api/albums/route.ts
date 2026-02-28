import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT id, immich_id, title, description, asset_count, cover_asset_id,
           voting_enabled, voting_start, voting_end, lottery_enabled
           FROM albums WHERE is_visible = 1 ORDER BY updated_at DESC`,
    args: []
  })
  return NextResponse.json(result.rows)
}
