export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { order } = await request.json()
  const db = getDb()
  const update = db.prepare('UPDATE albums SET sort_order = ? WHERE id = ?')
  for (const { id, sort_order } of order) {
    update.run(sort_order, id)
  }
  return NextResponse.json({ ok: true })
}
