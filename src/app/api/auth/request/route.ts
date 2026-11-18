export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { baseUrl, ipHash, randomToken, sha256 } from '@/lib/users'
import { loginMail, mailConfigured, sendMail } from '@/lib/mail'

const MIN = 60 * 1000

/** Schickt einen Anmelde-Link. Antwortet immer gleich, damit niemand Adressen ausspähen kann. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const lang = body.lang === 'en' ? 'en' : 'de'
  const next = typeof body.next === 'string' && body.next.startsWith('/') && !body.next.startsWith('//') ? body.next.slice(0, 200) : '/'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  const db = getDb()
  const now = Date.now()
  const ip = ipHash(request.headers)
  db.prepare('DELETE FROM login_tokens WHERE expires_at < ?').run(now - 24 * 60 * MIN)
  const perEmail = (db.prepare('SELECT COUNT(*) AS c FROM login_tokens WHERE email = ? AND created_at > ?').get(email, now - 15 * MIN) as { c: number }).c
  const perIp = (db.prepare('SELECT COUNT(*) AS c FROM login_tokens WHERE ip_hash = ? AND created_at > ?').get(ip, now - 60 * MIN) as { c: number }).c
  if (perEmail >= 3 || perIp >= 10) return NextResponse.json({ error: 'too_many' }, { status: 429 })

  const token = randomToken()
  db.prepare('INSERT INTO login_tokens (token_hash, email, lang, next, ip_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    sha256(token),
    email,
    lang,
    next,
    ip,
    now + 30 * MIN,
    now
  )
  const link = `${baseUrl()}/anmelden?token=${token}`
  const ok = await sendMail({ to: email, ...loginMail(lang, link) })
  if (!ok && mailConfigured()) return NextResponse.json({ error: 'mail_failed' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
