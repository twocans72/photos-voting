export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'

export async function POST() {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token) {
    const db = getDb()
    await db.execute({ sql: 'DELETE FROM admin_sessions WHERE token = ?', args: [token] })
  }
  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin_token')
  return response
}
