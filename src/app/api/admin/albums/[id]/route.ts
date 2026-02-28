export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const db = getDb()
  const fields: string[] = []
  const values: unknown[] = []
  if (body.is_visible !== undefined) { fields.push('is_visible = ?'); values.push(body.is_visible ? 1 : 0) }
  if (body.voting_enabled !== undefined) { fields.push('voting_enabled = ?'); values.push(body.voting_enabled ? 1 : 0) }
  if (body.voting_start !== undefined) { fields.push('voting_start = ?'); values.push(body.voting_start || null) }
  if (body.voting_end !== undefined) { fields.push('voting_end = ?'); values.push(body.voting_end || null) }
  if (body.lottery_enabled !== undefined) { fields.push('lottery_enabled = ?'); values.push(body.lottery_enabled ? 1 : 0) }
  if (fields.length === 0) return NextResponse.json({ error: 'No fields' }, { status: 400 })
  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(params.id)
  db.prepare(`UPDATE albums SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return NextResponse.json(db.prepare('SELECT * FROM albums WHERE id = ?').get(params.id))
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const album = getDb().prepare(`SELECT a.*, (SELECT COUNT(*) FROM votes v WHERE v.album_id=a.id) as vote_count, (SELECT COUNT(*) FROM lottery_participants lp WHERE lp.album_id=a.id) as lottery_count FROM albums a WHERE a.id=?`).get(params.id)
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(album)
}
