import { NextRequest, NextResponse } from 'next/server'
import { IMMICH_URL, IMMICH_API_KEY } from '@/lib/immich'

export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  const { assetId } = params
  const size = request.nextUrl.searchParams.get('size') || 'thumbnail'

  const res = await fetch(`${IMMICH_URL}/api/assets/${assetId}/thumbnail?size=${size}`, {
    headers: { 'x-api-key': IMMICH_API_KEY },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
