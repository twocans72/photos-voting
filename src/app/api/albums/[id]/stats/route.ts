export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const albumResult = await db.execute({ sql: 'SELECT * FROM albums WHERE id = ? AND is_visible = 1', args: [params.id] })
  if (!albumResult.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const totalResult = await db.execute({ sql: 'SELECT COUNT(*) as count FROM votes WHERE album_id = ?', args: [params.id] })
  const totalVotes = totalResult.rows[0].count as number

  const rank1 = await db.execute({
    sql: 'SELECT rank1_asset_id as asset_id, COUNT(*) as count FROM votes WHERE album_id = ? AND rank1_asset_id IS NOT NULL GROUP BY rank1_asset_id',
    args: [params.id]
  })
  const rank2 = await db.execute({
    sql: 'SELECT rank2_asset_id as asset_id, COUNT(*) as count FROM votes WHERE album_id = ? AND rank2_asset_id IS NOT NULL GROUP BY rank2_asset_id',
    args: [params.id]
  })
  const rank3 = await db.execute({
    sql: 'SELECT rank3_asset_id as asset_id, COUNT(*) as count FROM votes WHERE album_id = ? AND rank3_asset_id IS NOT NULL GROUP BY rank3_asset_id',
    args: [params.id]
  })

  const statsMap = new Map<string, { rank1: number; rank2: number; rank3: number }>()
  const ensure = (id: string) => { if (!statsMap.has(id)) statsMap.set(id, { rank1: 0, rank2: 0, rank3: 0 }); return statsMap.get(id)! }

  for (const r of rank1.rows) ensure(r.asset_id as string).rank1 = r.count as number
  for (const r of rank2.rows) ensure(r.asset_id as string).rank2 = r.count as number
  for (const r of rank3.rows) ensure(r.asset_id as string).rank3 = r.count as number

  const stats = Array.from(statsMap.entries()).map(([asset_id, s]) => ({
    asset_id,
    rank1_count: s.rank1,
    rank2_count: s.rank2,
    rank3_count: s.rank3,
    score: s.rank1 * 3 + s.rank2 * 2 + s.rank3,
  })).sort((a, b) => b.score - a.score)

  return NextResponse.json({ totalVotes, stats })
}
