export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { runTick } from '@/lib/sync'

/** Wird alle paar Minuten von scripts/worker.js aus dem Container heraus aufgerufen. */
export async function POST(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || request.headers.get('x-cron-key') !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await runTick())
  } catch (err) {
    console.error('[cron] tick failed:', err)
    return NextResponse.json({ error: 'tick_failed' }, { status: 500 })
  }
}
