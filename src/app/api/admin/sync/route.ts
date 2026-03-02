export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getAlbums } from '@/lib/immich'
import { getDb } from '@/lib/db'

export async function POST() {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const albums = await getAlbums()
  const db = getDb()
  const upsert = db.prepare(`
    INSERT INTO albums (immich_id, title, description, asset_count, cover_asset_id, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(immich_id) DO UPDATE SET
      title=excluded.title,
      description=excluded.description,
      asset_count=excluded.asset_count,
      cover_asset_id=excluded.cover_asset_id,
      updated_at=CURRENT_TIMESTAMP
  `)
  for (const a of albums) {
    upsert.run(a.id, a.albumName, a.description || null, a.assetCount, a.albumThumbnailAssetId || null)
  }
  return NextResponse.json({ synced: albums.length })
}