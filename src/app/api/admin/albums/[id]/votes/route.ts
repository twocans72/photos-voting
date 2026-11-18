export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

/** Auswertung pro Bild: Anzahl je Stufe, Schnitt und Favoriten. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = getDb()
    .prepare(
      `SELECT r.asset_id,
        COUNT(*) AS n,
        ROUND(AVG(r.value), 2) AS avg,
        SUM(r.value = 1) AS c1, SUM(r.value = 2) AS c2, SUM(r.value = 3) AS c3, SUM(r.value = 4) AS c4,
        (SELECT COUNT(*) FROM favorites f WHERE f.asset_id = r.asset_id) AS favs
       FROM ratings r WHERE r.album_id = ?
       GROUP BY r.asset_id ORDER BY avg DESC, n DESC`
    )
    .all(params.id)
  return NextResponse.json(rows)
}
