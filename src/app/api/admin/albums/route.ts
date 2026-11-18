export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { extendLotteries } from '@/lib/lottery'

export async function GET() {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  extendLotteries()
  const albums = getDb()
    .prepare(
      `SELECT a.*,
        (SELECT COUNT(*) FROM ratings r WHERE r.album_id = a.id) AS vote_count,
        (SELECT COUNT(DISTINCT r.user_id) FROM ratings r WHERE r.album_id = a.id AND r.user_id IS NOT NULL) AS lottery_count
       FROM albums a ORDER BY a.updated_at DESC`
    )
    .all()
  return NextResponse.json(albums)
}
