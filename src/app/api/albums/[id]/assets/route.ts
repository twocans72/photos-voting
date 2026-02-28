export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAlbum } from '@/lib/immich'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb()
  const result = await db.execute({ sql: 'SELECT * FROM albums WHERE id = ? AND is_visible = 1', args: [params.id] })
  const album = result.rows[0]
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const immichAlbum = await getAlbum(album.immich_id as string)
  const assets = (immichAlbum.assets || []).filter(a => a.type === 'IMAGE')
  return NextResponse.json(assets)
}
