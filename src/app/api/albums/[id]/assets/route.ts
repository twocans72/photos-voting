export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getAlbum, getAlbumAssets, ImmichApiError, ImmichAsset } from '@/lib/immich'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const album = getDb().prepare('SELECT * FROM albums WHERE id = ? AND is_visible = 1').get(params.id) as { immich_id: string } | undefined
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let assets: ImmichAsset[]
  try {
    assets = await getAlbumAssets(album.immich_id)
  } catch (err) {
    // Fallback for Immich versions that still embed assets in the album response
    const searchStatus = err instanceof ImmichApiError ? err.status : 0
    console.error('[assets] search/metadata failed, falling back to album assets:', err)
    try {
      const immichAlbum = await getAlbum(album.immich_id)
      assets = immichAlbum.assets || []
      if (assets.length === 0 && immichAlbum.assetCount > 0) {
        // Newer Immich: album response carries no assets, so the search failure is the real problem
        console.error(`[assets] album ${album.immich_id} has ${immichAlbum.assetCount} assets but none were returned (search status ${searchStatus})`)
        return NextResponse.json({ error: 'immich_search_failed', status: searchStatus }, { status: 502 })
      }
    } catch (err2) {
      console.error('[assets] Immich album fetch failed:', err2)
      const status = err2 instanceof ImmichApiError ? err2.status : 0
      return NextResponse.json({ error: 'immich_unavailable', status }, { status: 502 })
    }
  }
  return NextResponse.json(assets.filter(a => a.type === 'IMAGE'))
}
