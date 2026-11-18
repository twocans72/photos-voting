export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { extendLotteries, LOTTERY_MIN, participants, today } from '@/lib/lottery'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  extendLotteries()
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(params.id) as { lottery_enabled: number; lottery_drawn: number; lottery_end: string | null } | undefined
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!album.lottery_enabled) return NextResponse.json({ error: 'Lottery not enabled' }, { status: 400 })
  if (album.lottery_drawn) return NextResponse.json({ error: 'Already drawn' }, { status: 400 })
  const list = participants(params.id)
  if (list.length < LOTTERY_MIN) return NextResponse.json({ error: `Erst ${list.length} von ${LOTTERY_MIN} Teilnehmern` }, { status: 400 })
  if (album.lottery_end && today() <= album.lottery_end) return NextResponse.json({ error: `Die Verlosung läuft noch bis ${album.lottery_end}` }, { status: 400 })
  const winner = list[randomInt(list.length)]
  db.prepare('UPDATE albums SET lottery_drawn = 1, lottery_winner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(winner.email, params.id)
  return NextResponse.json({ winner })
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const album = getDb().prepare('SELECT lottery_winner_id FROM albums WHERE id = ?').get(params.id) as { lottery_winner_id: string | null } | undefined
  return NextResponse.json(participants(params.id).map((p) => ({ ...p, is_winner: album?.lottery_winner_id === p.email ? 1 : 0 })))
}
