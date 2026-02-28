export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  if (!await getAdminFromRequest()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT a.*,
      (SELECT COUNT(*) FROM votes v WHERE v.album_id = a.id) as vote_count,
      (SELECT COUNT(*) FROM lottery_participants lp WHERE lp.album_id = a.id) as lottery_count
      FROM albums a ORDER BY a.updated_at DESC`,
    args: []
  })
  return NextResponse.json(result.rows)
}
