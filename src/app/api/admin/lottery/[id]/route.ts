export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

interface Participant {
  id: number
  email: string
  ratings: number
  first_at: number
}

/** Teilnahmeberechtigt ist, wer eingeloggt mindestens ein Bild des Albums bewertet hat. */
function participants(albumId: string): Participant[] {
  return getDb()
    .prepare(
      `SELECT u.id, u.email, COUNT(*) AS ratings, MIN(r.created_at) AS first_at
       FROM ratings r JOIN users u ON u.id = r.user_id
       WHERE r.album_id = ? GROUP BY u.id ORDER BY first_at ASC`
    )
    .all(albumId) as Participant[]
}

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getDb()
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(params.id) as { lottery_enabled: number; lottery_drawn: number } | undefined
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!album.lottery_enabled) return NextResponse.json({ error: 'Lottery not enabled' }, { status: 400 })
  if (album.lottery_drawn) return NextResponse.json({ error: 'Already drawn' }, { status: 400 })
  const list = participants(params.id)
  if (list.length === 0) return NextResponse.json({ error: 'No participants' }, { status: 400 })
  const winner = list[randomInt(list.length)]
  db.prepare('UPDATE albums SET lottery_drawn = 1, lottery_winner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(winner.email, params.id)
  return NextResponse.json({ winner })
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const album = getDb().prepare('SELECT lottery_winner_id FROM albums WHERE id = ?').get(params.id) as { lottery_winner_id: string | null } | undefined
  return NextResponse.json(participants(params.id).map((p) => ({ ...p, is_winner: album?.lottery_winner_id === p.email ? 1 : 0 })))
}
