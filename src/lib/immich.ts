const IMMICH_URL = process.env.IMMICH_URL || 'http://immich:2283'
const IMMICH_API_KEY = process.env.IMMICH_API_KEY || ''

const headers = {
  'x-api-key': IMMICH_API_KEY,
  'Content-Type': 'application/json',
}

export interface ImmichAlbum {
  id: string
  albumName: string
  description: string
  assetCount: number
  albumThumbnailAssetId: string | null
  createdAt: string
  updatedAt: string
  assets?: ImmichAsset[]
}

export interface ImmichAsset {
  id: string
  originalFileName: string
  fileCreatedAt: string
  fileModifiedAt: string
  type: 'IMAGE' | 'VIDEO'
  thumbhash: string | null
  exifInfo?: {
    make?: string
    model?: string
    lensModel?: string
    fNumber?: number
    focalLength?: number
    iso?: number
    exposureTime?: string
    latitude?: number
    longitude?: number
    city?: string
    country?: string
    description?: string
  }
}

export async function getAlbums(): Promise<ImmichAlbum[]> {
  const res = await fetch(`${IMMICH_URL}/api/albums`, {
    headers,
    next: { revalidate: 300 }, // cache 5min
  })
  if (!res.ok) throw new Error(`Immich API error: ${res.status}`)
  return res.json()
}

export async function getAlbum(albumId: string): Promise<ImmichAlbum> {
  const res = await fetch(`${IMMICH_URL}/api/albums/${albumId}?withoutAssets=false`, {
    headers,
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Immich API error: ${res.status}`)
  return res.json()
}

export function getThumbnailUrl(assetId: string, size: 'thumbnail' | 'preview' = 'thumbnail'): string {
  return `${IMMICH_URL}/api/assets/${assetId}/thumbnail?size=${size}`
}

export function getOriginalUrl(assetId: string): string {
  return `${IMMICH_URL}/api/assets/${assetId}/original`
}

// Proxy thumbnail through our API to hide Immich URL and inject API key
export function getProxyThumbnailUrl(assetId: string, size: 'thumbnail' | 'preview' = 'thumbnail'): string {
  return `/api/proxy/thumbnail/${assetId}?size=${size}`
}

export function getProxyOriginalUrl(assetId: string): string {
  return `/api/proxy/original/${assetId}`
}

export { IMMICH_URL, IMMICH_API_KEY }
