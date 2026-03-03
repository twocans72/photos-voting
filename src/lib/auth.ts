import { cookies } from 'next/headers'
import { getDb } from './db'
import { randomBytes, createHash } from 'crypto'
import bcrypt from 'bcryptjs'

const SESSION_DURATION = 24 * 60 * 60 * 1000

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12)
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.NEXTAUTH_SECRET || '')).digest('hex').slice(0, 16)
}

export function createAdminSession(token: string): void {
  const db = getDb()
  const expires = Date.now() + SESSION_DURATION
  db.prepare('INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)').run(token, expires)
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(Date.now())
}

export function validateAdminSession(token: string): boolean {
  const db = getDb()
  const session = db.prepare('SELECT id FROM admin_sessions WHERE token = ? AND expires_at > ?').get(token, Date.now())
  return !!session
}

export function getAdminFromRequest(): boolean {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return false
  return validateAdminSession(token)
}

export function generateSessionToken(): string {
  return randomBytes(16).toString('hex')
}
