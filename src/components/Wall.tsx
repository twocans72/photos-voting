'use client'

import { useEffect, useLayoutEffect, useRef, useState, PointerEvent } from 'react'
import { EMOJI, imgUrl, Photo } from '@/lib/photo'
import { useLang } from '@/lib/LanguageContext'
import { Heart, IconExpand } from './ui'

interface Props {
  photos: Photo[]
  /** Stufe 0–4 pro Bild; bestimmt die Grösse der Kachel */
  levels: Record<string, number>
  mine: Record<string, number>
  favs: Set<string>
  canRate: boolean
  onRate: (id: string, value: number) => void
  onFav: (id: string) => void
  onFocus: (id: string) => void
}

// Grösse einer Kachel in Rastereinheiten je Stufe: [unbewertet, Nicht meins, OK, Gutes Foto, Love it].
// «Nicht meins» behält seinen Platz und schrumpft innerhalb der Zelle (siehe CSS),
// so bleibt das Raster immer lückenlos füllbar.
const SIZE = [1, 1, 1, 2, 3]

const HOLD_START = 350 // ms bis aus dem Tippen ein Halten wird
const HOLD_STEP = 550 // ms pro Stufe

function useGrid() {
  const [grid, setGrid] = useState({ n: 4, width: 1280 })
  useEffect(() => {
    const measure = () => {
      const width = window.innerWidth
      setGrid({ n: width >= 1100 ? 4 : width >= 640 ? 3 : 2, width })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])
  return grid
}

/**
 * Spalten und Zeilen einer Kachel. Eine Rastereinheit ist 4:3. Es gibt nur drei
 * Formen – Quer, Hoch und Panorama –, damit die Kacheln ohne Lücken ineinandergreifen.
 */
function span(n: number, level: number, ratio: number): [number, number] {
  const size = Math.min(n, SIZE[level])
  if (ratio >= 2) {
    const cols = Math.min(n, Math.max(2, size * 2))
    return [cols, Math.max(1, Math.round((cols * 4) / 3 / ratio))]
  }
  if (ratio < 0.9) return size === 1 ? [1, 2] : [2, 3]
  return [size, size]
}

function holdLevel(ms: number): number {
  return ms < HOLD_START ? -1 : Math.floor((ms - HOLD_START) / HOLD_STEP) % 3
}

export function Wall({ photos, levels, mine, favs, canRate, onRate, onFav, onFocus }: Props) {
  const { t } = useLang()
  const { n, width } = useGrid()
  const gridRef = useRef<HTMLDivElement>(null)
  const [hold, setHold] = useState<{ id: string; hl: number } | null>(null)
  const [popId, setPopId] = useState<string | null>(null)
  const press = useRef<{ id: string; t: number; x: number; y: number } | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const anchor = useRef<{ id: string; top: number } | null>(null)

  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    press.current = null
    setHold(null)
  }
  useEffect(() => stop, [])

  // Nach dem Umordnen bleibt das gerade bewertete Bild an derselben Stelle im Fenster.
  useLayoutEffect(() => {
    const a = anchor.current
    if (!a || !gridRef.current) return
    anchor.current = null
    const el = gridRef.current.querySelector<HTMLElement>(`[data-id="${a.id}"]`)
    if (!el) return
    const delta = el.getBoundingClientRect().top - a.top
    if (Math.abs(delta) > 1) window.scrollBy(0, delta)
  }, [levels, n])

  const down = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    if (!canRate || e.button !== 0) return
    press.current = { id, t: Date.now(), x: e.clientX, y: e.clientY }
    setHold({ id, hl: -1 })
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      const p = press.current
      if (!p) return
      const hl = holdLevel(Date.now() - p.t)
      setHold((h) => (h && h.id === p.id && h.hl !== hl ? { id: p.id, hl } : h))
    }, 80)
  }

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) stop() // das war Scrollen, keine Stimme
  }

  const up = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    const p = press.current
    if (!p || p.id !== id) return
    const hl = holdLevel(Date.now() - p.t)
    stop()
    const value = hl < 0 ? (mine[id] === 1 ? 0 : 1) : 2 + hl
    anchor.current = { id, top: e.currentTarget.getBoundingClientRect().top }
    setPopId(id)
    setTimeout(() => setPopId((cur) => (cur === id ? null : cur)), 500)
    onRate(id, value)
  }

  return (
    <div className="wall">
      <div className="wall-grid" ref={gridRef} style={{ ['--n' as string]: n }}>
        {photos.map((p, i) => {
          const level = levels[p.id] || 0
          const [cols, rows] = span(n, level, p.w / p.h)
          const my = mine[p.id] || 0
          const holding = hold && hold.id === p.id && hold.hl >= 0 ? hold.hl : -1
          const big = (cols / n) * width > 300
          const fav = favs.has(p.id)
          return (
            <div
              key={p.id}
              data-id={p.id}
              className={`tile lv${level}${popId === p.id ? ' pop' : ''}${canRate ? '' : ' locked'}`}
              style={{ gridColumn: `span ${cols}`, gridRow: `span ${rows}` }}
            >
              <button
                className="hit"
                aria-label={my ? t.tileRated(i + 1, t.names[my]) : t.tileUnrated(i + 1)}
                onPointerDown={(e) => down(e, p.id)}
                onPointerMove={move}
                onPointerUp={(e) => up(e, p.id)}
                onPointerLeave={stop}
                onPointerCancel={stop}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => {
                  // Tastatur (Enter/Leertaste) und gesperrte Alben öffnen den Fokus-Modus
                  if (e.detail === 0 || !canRate) onFocus(p.id)
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl(p.id, big ? 'preview' : 'thumbnail')} alt="" loading="lazy" decoding="async" draggable={false} />
                {holding >= 0 && (
                  <span className="holding">
                    <span className="big" aria-hidden="true">
                      {EMOJI[2 + holding]}
                    </span>
                    <span className="display" style={{ fontSize: (cols / n) * width < 240 ? 16 : 24 }}>
                      {t.names[2 + holding]}
                    </span>
                    <span className="segs">
                      {[0, 1, 2].map((s) => (
                        <span key={s} className={s <= holding ? 'on' : ''} />
                      ))}
                    </span>
                  </span>
                )}
              </button>
              {my > 0 && holding < 0 && (
                <span className="glass badge" aria-hidden="true">
                  {EMOJI[my]}
                </span>
              )}
              <button className="glass round fav" aria-label={fav ? t.favRemove : t.favAdd} aria-pressed={fav} onClick={() => onFav(p.id)}>
                <Heart on={fav} size={22} />
              </button>
              <button className="glass round foc" aria-label={t.focusOpen} onClick={() => onFocus(p.id)}>
                <IconExpand />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
