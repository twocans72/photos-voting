import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!await getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT v.id, v.rank1_asset_id, v.rank2_asset_id, v.rank3_asset_id,
           v.name, v.email, v.created_at, lp.is_winner
           FROM votes v LEFT JOIN lottery_participants lp ON lp.vote_id = v.id
           WHERE v.album_id = ? ORDER BY v.created_at DESC`,
    args: [params.id]
  })
  return NextResponse.json(result.rows)
}
