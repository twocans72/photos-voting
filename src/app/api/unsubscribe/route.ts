export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { baseUrl } from '@/lib/users'

function unsubscribe(token: string | null): boolean {
  if (!token || !/^[a-f0-9]{32}$/.test(token)) return false
  return getDb().prepare('UPDATE users SET notify = 0 WHERE unsub_token = ?').run(token).changes > 0
}

/** Abmelde-Link aus der Mail. */
export async function GET(request: NextRequest) {
  unsubscribe(request.nextUrl.searchParams.get('t'))
  return NextResponse.redirect(`${baseUrl()}/abgemeldet`)
}

/** One-Click-Abmeldung der Mailprogramme (List-Unsubscribe-Post). */
export async function POST(request: NextRequest) {
  unsubscribe(request.nextUrl.searchParams.get('t'))
  return NextResponse.json({ ok: true })
}
