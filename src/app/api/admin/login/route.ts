export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyPassword, generateToken, createAdminSession, hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()
  const db = getDb()
  const count = (db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number }).count
  if (count === 0) {
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hashPassword(process.env.ADMIN_PASSWORD || 'changeme'))
  }
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as { password_hash: string } | undefined
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const token = generateToken()
  createAdminSession(token)
  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 86400, path: '/' })
  return response
}
