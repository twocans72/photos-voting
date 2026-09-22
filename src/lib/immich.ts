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
  width?: number
  height?: number
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
    exifImageWidth?: number
    exifImageHeight?: number
  }
}
export async function getAlbums(): Promise<ImmichAlbum[]> {
  const res = await fetch(`${IMMICH_URL}/api/albums`, {
    headers,
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Immich API error: ${res.status}`)
  return res.json()
}
export async function getAlbum(albumId: string): Promise<ImmichAlbum> {
  const res = await fetch(`${IMMICH_URL}/api/albums/${albumId}`, {
    headers,
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`Immich API error: ${res.status}`)
  return res.json()
}
interface SearchMetadataResponse {
  assets: {
    items: ImmichAsset[]
    nextPage: string | null
  }
}
const SEARCH_PAGE_SIZE = 1000
export class ImmichApiError extends Error {
  status: number
  constructor(status: number, endpoint: string) {
    super(`Immich API error ${status} on ${endpoint}`)
    this.status = status
  }
}
// Immich v3 removed `assets` from the album response (immich-app/immich#27835).
// The metadata search endpoint works on old and new versions and supports paging.
export async function getAlbumAssets(albumId: string): Promise<ImmichAsset[]> {
  const all: ImmichAsset[] = []
  let page = 1
  for (;;) {
    const res = await fetch(`${IMMICH_URL}/api/search/metadata`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ albumIds: [albumId], withExif: true, size: SEARCH_PAGE_SIZE, page }),
      cache: 'no-store',
    })
    if (!res.ok) throw new ImmichApiError(res.status, 'POST /api/search/metadata')
    const data = (await res.json()) as SearchMetadataResponse
    const items = data.assets?.items || []
    all.push(...items)
    if (!data.assets?.nextPage || items.length === 0) break
    page = parseInt(data.assets.nextPage, 10)
    if (!Number.isFinite(page) || page <= 0) break
  }
  return all
}
export function getThumbnailUrl(assetId: string, size: 'thumbnail' | 'preview' = 'thumbnail'): string {
  return `${IMMICH_URL}/api/assets/${assetId}/thumbnail?size=${size}`
}
export function getOriginalUrl(assetId: string): string {
  return `${IMMICH_URL}/api/assets/${assetId}/original`
}
export function getProxyThumbnailUrl(assetId: string, size: 'thumbnail' | 'preview' = 'thumbnail'): string {
  return `/api/proxy/thumbnail/${assetId}?size=${size}`
}
export function getProxyOriginalUrl(assetId: string): string {
  return `/api/proxy/original/${assetId}`
}
export { IMMICH_URL, IMMICH_API_KEY }
