export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function GET() {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const albums = getDb().prepare(`SELECT a.*, (SELECT COUNT(*) FROM votes v WHERE v.album_id=a.id) as vote_count, (SELECT COUNT(*) FROM lottery_participants lp WHERE lp.album_id=a.id) as lottery_count FROM albums a ORDER BY a.updated_at DESC`).all()
  return NextResponse.json(albums)
}
