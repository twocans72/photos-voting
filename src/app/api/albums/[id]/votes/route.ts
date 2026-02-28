import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { hashIp, generateSessionToken } from '@/lib/auth'
import { getVotingStatus } from '@/types'
import type { Album } from '@/types'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const albumResult = await db.execute({ sql: 'SELECT * FROM albums WHERE id = ? AND is_visible = 1', args: [params.id] })
  const album = albumResult.rows[0] as unknown as Album
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const status = getVotingStatus(album)
  if (!status.isOpen) return NextResponse.json({ error: 'Voting is not open' }, { status: 400 })

  const body = await request.json()
  const { rank1, rank2, rank3, email, name } = body
  if (!rank1) return NextResponse.json({ error: 'rank1 is required' }, { status: 400 })

  const cookieStore = cookies()
  let sessionToken = cookieStore.get(`vote_${params.id}`)?.value
  if (!sessionToken) sessionToken = generateSessionToken()

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const ipHash = hashIp(ip)

  const existing = await db.execute({
    sql: 'SELECT id FROM votes WHERE album_id = ? AND session_token = ?',
    args: [params.id, sessionToken]
  })
  if (existing.rows.length > 0) return NextResponse.json({ error: 'Already voted' }, { status: 409 })

  const voteResult = await db.execute({
    sql: `INSERT INTO votes (album_id, session_token, rank1_asset_id, rank2_asset_id, rank3_asset_id, email, name, ip_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [params.id, sessionToken, rank1, rank2 || null, rank3 || null, email || null, name || null, ipHash]
  })

  if (email && album.lottery_enabled && !album.lottery_drawn) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO lottery_participants (album_id, vote_id, email, name) VALUES (?, ?, ?, ?)`,
      args: [params.id, voteResult.lastInsertRowid, email, name || null]
    })
  }

  const response = NextResponse.json({ success: true, sessionToken })
  response.cookies.set(`vote_${params.id}`, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
  })
  return response
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const sessionToken = cookieStore.get(`vote_${params.id}`)?.value
  if (!sessionToken) return NextResponse.json({ voted: false })
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM votes WHERE album_id = ? AND session_token = ?',
    args: [params.id, sessionToken]
  })
  if (!result.rows[0]) return NextResponse.json({ voted: false })
  return NextResponse.json({ voted: true, vote: result.rows[0] })
}
