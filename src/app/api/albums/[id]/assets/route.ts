export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAlbum } from '@/lib/immich'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const album = getDb().prepare('SELECT * FROM albums WHERE id = ? AND is_visible = 1').get(params.id) as { immich_id: string } | undefined
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const immichAlbum = await getAlbum(album.immich_id)
  return NextResponse.json((immichAlbum.assets || []).filter(a => a.type === 'IMAGE'))
}
