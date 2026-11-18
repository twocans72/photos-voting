import { getDb } from './db'

/** Eine Verlosung findet erst statt (und wird erst öffentlich gezeigt), wenn so viele Konten teilnehmen. */
export const LOTTERY_MIN = 5

export interface Participant {
  id: number
  email: string
  ratings: number
  first_at: number
}

/** Teil nimmt, wer angemeldet mindestens ein Bild des Albums bewertet hat. Alle Stimmen zählen, egal von wann. */
export function participants(albumId: number | string): Participant[] {
  return getDb()
    .prepare(
      `SELECT u.id, u.email, COUNT(*) AS ratings, MIN(r.created_at) AS first_at
       FROM ratings r JOIN users u ON u.id = r.user_id
       WHERE r.album_id = ? GROUP BY u.id ORDER BY first_at ASC`
    )
    .all(albumId) as Participant[]
}

export function participantCount(albumId: number | string): number {
  const row = getDb().prepare('SELECT COUNT(DISTINCT user_id) AS n FROM ratings WHERE album_id = ? AND user_id IS NOT NULL').get(albumId) as { n: number }
  return row.n
}

/** Heutiges Datum in der Schweiz als JJJJ-MM-TT. */
export function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date())
}

export function isDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
}

/** Einen Monat später; der 31. Januar wird zum letzten Februartag. */
export function addMonth(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate() // letzter Tag des Folgemonats
  const next = new Date(Date.UTC(y, m, Math.min(d, last)))
  return next.toISOString().slice(0, 10)
}

/**
 * Verlosungen, deren Enddatum vorbei ist, ohne dass genug Konten teilgenommen haben,
 * laufen automatisch einen Monat weiter (wenn nötig mehrere Monate, bis das Datum wieder in der Zukunft liegt).
 * Gibt die Anzahl verlängerter Verlosungen zurück.
 */
export function extendLotteries(): number {
  const db = getDb()
  const now = today()
  const due = db
    .prepare(`SELECT id, lottery_end FROM albums WHERE lottery_enabled = 1 AND lottery_drawn = 0 AND lottery_end IS NOT NULL AND lottery_end < ?`)
    .all(now) as { id: number; lottery_end: string }[]
  let extended = 0
  for (const a of due) {
    if (!isDate(a.lottery_end) || participantCount(a.id) >= LOTTERY_MIN) continue
    let end = a.lottery_end
    while (end < now) end = addMonth(end)
    db.prepare('UPDATE albums SET lottery_end = ? WHERE id = ?').run(end, a.id)
    console.log(`[lottery] Album ${a.id}: zu wenige Teilnehmer, verlängert von ${a.lottery_end} auf ${end}`)
    extended++
  }
  return extended
}

interface LotteryAlbum {
  id: number
  lottery_enabled: number
  lottery_drawn: number
  lottery_end?: string | null
}

/**
 * Was Besucher von der Verlosung sehen: nichts, solange sie aus ist, gezogen wurde
 * oder noch keine fünf Konten teilnehmen; sonst das Enddatum (oder null, wenn keines gesetzt ist).
 */
export function publicLottery(album: LotteryAlbum): { until: string | null } | null {
  if (!album.lottery_enabled || album.lottery_drawn) return null
  if (participantCount(album.id) < LOTTERY_MIN) return null
  return { until: album.lottery_end || null }
}
