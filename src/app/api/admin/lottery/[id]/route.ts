export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(params.id) as { lottery_enabled: number; lottery_drawn: number } | undefined
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!album.lottery_enabled) return NextResponse.json({ error: 'Lottery not enabled' }, { status: 400 })
  if (album.lottery_drawn) return NextResponse.json({ error: 'Already drawn' }, { status: 400 })
  const participants = db.prepare('SELECT * FROM lottery_participants WHERE album_id = ? AND is_winner = 0').all(params.id) as { id: number; email: string; name: string | null }[]
  if (participants.length === 0) return NextResponse.json({ error: 'No participants' }, { status: 400 })
  const winner = participants[Math.floor(Math.random() * participants.length)]
  db.prepare('UPDATE lottery_participants SET is_winner = 1 WHERE id = ?').run(winner.id)
  db.prepare('UPDATE albums SET lottery_drawn = 1, lottery_winner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(winner.email, params.id)
  return NextResponse.json({ winner })
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const participants = getDb().prepare(`SELECT lp.*, v.rank1_asset_id FROM lottery_participants lp JOIN votes v ON v.id=lp.vote_id WHERE lp.album_id=? ORDER BY lp.is_winner DESC, lp.created_at ASC`).all(params.id)
  return NextResponse.json(participants)
}
