export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { adoptVisitorRatings, cookieOptions, COOKIE_NAMES, createSession, findOrCreateUser, getVisitor, sha256 } from '@/lib/users'

/**
 * Löst einen Anmelde-Link ein. Bewusst POST: Mail-Scanner rufen Links per GET
 * ab und würden den Einmal-Link sonst verbrauchen.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const token = String(body.token || '')
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const db = getDb()
  const now = Date.now()
  const row = db.prepare('SELECT * FROM login_tokens WHERE token_hash = ?').get(sha256(token)) as
    | { email: string; lang: string | null; next: string | null; expires_at: number; used_at: number | null }
    | undefined
  if (!row || row.used_at || row.expires_at < now) return NextResponse.json({ error: 'expired' }, { status: 410 })
  db.prepare('UPDATE login_tokens SET used_at = ? WHERE token_hash = ?').run(now, sha256(token))

  const user = findOrCreateUser(row.email, row.lang === 'en' ? 'en' : 'de')
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(now, user.id)
  adoptVisitorRatings(user.id, getVisitor())

  const response = NextResponse.json({ ok: true, next: row.next || '/', lang: user.lang })
  response.cookies.set(COOKIE_NAMES.session, createSession(user.id), cookieOptions(180))
  return response
}
