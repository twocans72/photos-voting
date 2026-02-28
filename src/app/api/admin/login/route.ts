import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { verifyPassword, generateToken, createAdminSession, hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()
  const db = getDb()

  const countResult = await db.execute({ sql: 'SELECT COUNT(*) as count FROM admins', args: [] })
  const count = countResult.rows[0].count as number
  if (count === 0) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'changeme'
    await db.execute({
      sql: 'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
      args: ['admin', hashPassword(defaultPassword)]
    })
  }

  const result = await db.execute({ sql: 'SELECT * FROM admins WHERE username = ?', args: [username] })
  const admin = result.rows[0]

  if (!admin || !verifyPassword(password, admin.password_hash as string)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = generateToken()
  await createAdminSession(token)

  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400,
    path: '/',
  })
  return response
}
