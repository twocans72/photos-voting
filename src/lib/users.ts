import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'
import { getDb } from './db'

export interface User {
  id: number
  email: string
  lang: 'de' | 'en'
  notify: number
  unsub_token: string
  created_at: number
}

const SESSION_COOKIE = 'sid'
const VISITOR_COOKIE = 'vid'
const SESSION_DAYS = 180
const DAY = 24 * 60 * 60 * 1000

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

export function baseUrl(): string {
  return (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

export function cookieOptions(maxAgeDays: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: maxAgeDays * 24 * 60 * 60,
    path: '/',
  }
}

/** Eingeloggter User aus dem Session-Cookie, sonst null. */
export function getUser(): User | null {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null
  const row = getDb()
    .prepare(
      `SELECT u.* FROM user_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .get(sha256(token), Date.now()) as User | undefined
  return row || null
}

/** Legt eine Session an und gibt das Klartext-Token für das Cookie zurück. */
export function createSession(userId: number): string {
  const db = getDb()
  const token = randomToken()
  const now = Date.now()
  db.prepare('INSERT INTO user_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    sha256(token),
    userId,
    now + SESSION_DAYS * DAY,
    now
  )
  db.prepare('DELETE FROM user_sessions WHERE expires_at < ?').run(now)
  return token
}

export function destroySession(): void {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (token) getDb().prepare('DELETE FROM user_sessions WHERE token_hash = ?').run(sha256(token))
}

export function getVisitor(): string | null {
  const v = cookies().get(VISITOR_COOKIE)?.value
  return v && /^[a-f0-9]{32}$/.test(v) ? v : null
}

export function findOrCreateUser(email: string, lang: 'de' | 'en'): User {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined
  if (existing) return existing
  const now = Date.now()
  db.prepare('INSERT INTO users (email, lang, notify, unsub_token, created_at) VALUES (?, ?, 1, ?, ?)').run(
    email,
    lang,
    randomToken(16),
    now
  )
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User
}

/**
 * Übernimmt die anonymen Stimmen eines Geräts ins Konto. Hat das Konto für ein
 * Bild schon eine Stimme, gewinnt die des Kontos.
 */
export function adoptVisitorRatings(userId: number, visitor: string | null): void {
  if (!visitor) return
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare(
      `DELETE FROM ratings WHERE user_id IS NULL AND visitor = ?
       AND asset_id IN (SELECT asset_id FROM ratings WHERE user_id = ?)`
    ).run(visitor, userId)
    db.prepare('UPDATE ratings SET user_id = ?, visitor = NULL WHERE user_id IS NULL AND visitor = ?').run(userId, visitor)
  })
  tx()
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  return (fwd ? fwd.split(',')[0] : headers.get('x-real-ip') || 'unknown').trim()
}

export function ipHash(headers: Headers): string {
  return sha256(clientIp(headers) + (process.env.NEXTAUTH_SECRET || '')).slice(0, 16)
}

export const COOKIE_NAMES = { session: SESSION_COOKIE, visitor: VISITOR_COOKIE }
