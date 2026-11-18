export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { COOKIE_NAMES, destroySession } from '@/lib/users'

export async function POST() {
  destroySession()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAMES.session, '', { path: '/', maxAge: 0 })
  return response
}
