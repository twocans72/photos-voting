export interface Photo {
  id: string
  w: number
  h: number
  date: string
  name: string
  exif: {
    camera: string | null
    lens: string | null
    focal: number | null
    f: number | null
    exp: string | null
    iso: number | null
  }
}

/** Anzahl Stimmen je Stufe: [Nicht meins, OK, Gutes Foto, Love it] */
export type Counts = [number, number, number, number]
export type Stats = Record<string, Counts>

/** Index = Stufe (0 = unbewertet) */
export const EMOJI = ['', '🤷', '👍', '🤜🤛', '😍']

export function imgUrl(id: string, size: 'thumbnail' | 'preview' = 'thumbnail'): string {
  return `/api/proxy/thumbnail/${id}?size=${size}`
}

export function exifLine(p: Photo): string {
  const e = p.exif
  return [e.camera, e.lens, e.focal ? `${Math.round(e.focal)} mm` : null, e.f ? `f/${e.f}` : null, e.exp ? `${e.exp} s` : null, e.iso ? `ISO ${e.iso}` : null]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Stufe eines Bildes auf der «Wand aller»: aus dem Schnitt aller Stimmen.
 * Damit nicht irgendwann alles gross ist, dürfen höchstens rund 12 % der
 * Bilder die grösste Stufe haben; der Rest davon rutscht eine Stufe tiefer.
 */
export function communityLevels(photos: Photo[], all: Stats): Record<string, number> {
  const levels: Record<string, number> = {}
  const top: { id: string; score: number }[] = []
  for (const p of photos) {
    const c = all[p.id]
    const n = c ? c[0] + c[1] + c[2] + c[3] : 0
    if (!c || n === 0) {
      levels[p.id] = 0
      continue
    }
    const avg = (c[0] + 2 * c[1] + 3 * c[2] + 4 * c[3]) / n
    const level = avg >= 3.5 ? 4 : avg >= 2.6 ? 3 : avg >= 1.6 ? 2 : 1
    levels[p.id] = level
    if (level === 4) top.push({ id: p.id, score: avg * Math.log(n + 1) })
  }
  const max = Math.max(2, Math.ceil(photos.length * 0.12))
  if (top.length > max) {
    top.sort((a, b) => b.score - a.score)
    for (const t of top.slice(max)) levels[t.id] = 3
  }
  return levels
}
