import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!await getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const albumResult = await db.execute({ sql: 'SELECT * FROM albums WHERE id = ?', args: [params.id] })
  const album = albumResult.rows[0]
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!album.lottery_enabled) return NextResponse.json({ error: 'Lottery not enabled' }, { status: 400 })
  if (album.lottery_drawn) return NextResponse.json({ error: 'Already drawn' }, { status: 400 })

  const partResult = await db.execute({
    sql: 'SELECT * FROM lottery_participants WHERE album_id = ? AND is_winner = 0',
    args: [params.id]
  })
  if (partResult.rows.length === 0) return NextResponse.json({ error: 'No participants' }, { status: 400 })

  const winner = partResult.rows[Math.floor(Math.random() * partResult.rows.length)]
  await db.execute({ sql: 'UPDATE lottery_participants SET is_winner = 1 WHERE id = ?', args: [winner.id] })
  await db.execute({
    sql: 'UPDATE albums SET lottery_drawn = 1, lottery_winner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [winner.email, params.id]
  })
  return NextResponse.json({ winner })
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!await getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT lp.*, v.rank1_asset_id, v.rank2_asset_id, v.rank3_asset_id
          FROM lottery_participants lp JOIN votes v ON v.id = lp.vote_id
          WHERE lp.album_id = ? ORDER BY lp.is_winner DESC, lp.created_at ASC`,
    args: [params.id]
  })
  return NextResponse.json(result.rows)
}
