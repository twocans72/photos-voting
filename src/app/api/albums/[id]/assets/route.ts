export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAlbum, getAlbumAssets, ImmichAsset } from '@/lib/immich'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const album = getDb().prepare('SELECT * FROM albums WHERE id = ? AND is_visible = 1').get(params.id) as { immich_id: string } | undefined
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let assets: ImmichAsset[]
  try {
    assets = await getAlbumAssets(album.immich_id)
  } catch (err) {
    // Fallback for Immich versions that still embed assets in the album response
    console.error('search/metadata failed, falling back to album assets:', err)
    try {
      const immichAlbum = await getAlbum(album.immich_id)
      assets = immichAlbum.assets || []
    } catch (err2) {
      console.error('Immich album fetch failed:', err2)
      return NextResponse.json({ error: 'Immich unavailable' }, { status: 502 })
    }
  }
  return NextResponse.json(assets.filter(a => a.type === 'IMAGE'))
}
