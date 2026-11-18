export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/users'

export async function GET() {
  const user = getUser()
  return NextResponse.json({ user: user ? { email: user.email, lang: user.lang, notify: !!user.notify } : null })
}
