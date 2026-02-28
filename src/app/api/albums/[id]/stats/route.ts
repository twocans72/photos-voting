export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  if (!db.prepare('SELECT * FROM albums WHERE id = ? AND is_visible = 1').get(params.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const totalVotes = (db.prepare('SELECT COUNT(*) as count FROM votes WHERE album_id = ?').get(params.id) as { count: number }).count
  const rank1 = db.prepare('SELECT rank1_asset_id as asset_id, COUNT(*) as count FROM votes WHERE album_id = ? AND rank1_asset_id IS NOT NULL GROUP BY rank1_asset_id').all(params.id) as { asset_id: string; count: number }[]
  const rank2 = db.prepare('SELECT rank2_asset_id as asset_id, COUNT(*) as count FROM votes WHERE album_id = ? AND rank2_asset_id IS NOT NULL GROUP BY rank2_asset_id').all(params.id) as { asset_id: string; count: number }[]
  const rank3 = db.prepare('SELECT rank3_asset_id as asset_id, COUNT(*) as count FROM votes WHERE album_id = ? AND rank3_asset_id IS NOT NULL GROUP BY rank3_asset_id').all(params.id) as { asset_id: string; count: number }[]
  const map = new Map<string, { r1: number; r2: number; r3: number }>()
  const e = (id: string) => { if (!map.has(id)) map.set(id, { r1: 0, r2: 0, r3: 0 }); return map.get(id)! }
  for (const r of rank1) e(r.asset_id).r1 = r.count
  for (const r of rank2) e(r.asset_id).r2 = r.count
  for (const r of rank3) e(r.asset_id).r3 = r.count
  const stats = Array.from(map.entries()).map(([asset_id, s]) => ({ asset_id, rank1_count: s.r1, rank2_count: s.r2, rank3_count: s.r3, score: s.r1*3 + s.r2*2 + s.r3 })).sort((a, b) => b.score - a.score)
  return NextResponse.json({ totalVotes, stats })
}
