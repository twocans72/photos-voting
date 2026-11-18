export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { COOKIE_NAMES, getUser } from '@/lib/users'

export async function PATCH(request: NextRequest) {
  const user = getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const db = getDb()
  if (body.lang === 'de' || body.lang === 'en') db.prepare('UPDATE users SET lang = ? WHERE id = ?').run(body.lang, user.id)
  if (typeof body.notify === 'boolean') db.prepare('UPDATE users SET notify = ? WHERE id = ?').run(body.notify ? 1 : 0, user.id)
  const fresh = db.prepare('SELECT email, lang, notify FROM users WHERE id = ?').get(user.id) as { email: string; lang: string; notify: number }
  return NextResponse.json({ user: { email: fresh.email, lang: fresh.lang, notify: !!fresh.notify } })
}

/** Löscht das Konto samt Stimmen, Favoriten und Sitzungen. */
export async function DELETE() {
  const user = getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  getDb().prepare('DELETE FROM users WHERE id = ?').run(user.id)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAMES.session, '', { path: '/', maxAge: 0 })
  return response
}
