'use client'

import { useEffect, useRef, useState, PointerEvent } from 'react'
import { EMOJI, imgUrl, Photo } from '@/lib/photo'
import { useLang } from '@/lib/LanguageContext'
import { Heart, IconClose } from './ui'

type Dir = 'u' | 'r' | 'd' | 'l'
const VALUE: Record<Dir, number> = { u: 4, r: 3, d: 2, l: 1 }
const ARROW: Record<Dir, string> = { u: '↑', r: '→', d: '↓', l: '←' }
const DRAG = 30 // px bis eine Richtung gewählt ist

interface Props {
  title: string
  photos: Photo[]
  mine: Record<string, number>
  favs: Set<string>
  onRate: (id: string, value: number) => void
  onFav: (id: string) => void
  onClose: () => void
}

/** Kompass: ein Bild nach dem anderen, die vier Richtungen sind die vier Stimmen. */
export function Kompass({ title, photos, mine, favs, onRate, onFav, onClose }: Props) {
  const { t } = useLang()
  // Unbewertete zuerst; ist alles bewertet, das ganze Album
  const [queue, setQueue] = useState<Photo[]>(() => {
    const open = photos.filter((p) => !mine[p.id])
    return open.length > 0 ? open : photos
  })
  const [i, setI] = useState(0)
  const [fly, setFly] = useState<Dir | ''>('')
  const [piles, setPiles] = useState<Record<Dir, string[]>>({ u: [], r: [], d: [], l: [] })
  const [pie, setPie] = useState<{ x: number; y: number; dir: Dir | '' } | null>(null)
  const [used, setUsed] = useState(false)
  const [touch, setTouch] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cur = queue[i]

  useEffect(() => {
    setTouch(window.matchMedia('(hover: none)').matches)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      if (timeout.current) clearTimeout(timeout.current)
    }
  }, [])

  const vote = (dir: Dir) => {
    if (!cur || fly) return
    setUsed(true)
    setPie(null)
    setFly(dir)
    onRate(cur.id, VALUE[dir])
    const id = cur.id
    timeout.current = setTimeout(() => {
      setPiles((p) => ({ ...p, [dir]: [...p[dir], id].slice(-9) }))
      setI((n) => n + 1)
      setFly('')
    }, 360)
  }

  const toggleFav = () => {
    if (!cur) return
    setUsed(true)
    onFav(cur.id)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowUp') vote('u')
      else if (e.key === 'ArrowRight') vote('r')
      else if (e.key === 'ArrowDown') vote('d')
      else if (e.key === 'ArrowLeft') vote('l')
      else if (e.key === 'f' || e.key === 'F') toggleFav()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (fly || !cur || e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
    setPie({ x: e.clientX, y: e.clientY, dir: '' })
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    let dir: Dir | '' = ''
    if (Math.hypot(dx, dy) > DRAG) dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : dy > 0 ? 'd' : 'u'
    setPie((p) => (p && p.dir !== dir ? { ...p, dir } : p))
  }
  const up = () => {
    if (!start.current) return
    start.current = null
    const dir = pie ? pie.dir : ''
    setPie(null)
    if (dir) vote(dir)
    else toggleFav()
  }
  const cancel = () => {
    start.current = null
    setPie(null)
  }

  const edge = (dir: Dir, col: boolean) => (
    <button className={`edge ${dir}${col ? ' col' : ''}${pie && pie.dir === dir ? ' hot' : ''}`} onClick={() => vote(dir)} aria-label={`${t.names[VALUE[dir]]} (${ARROW[dir]})`}>
      <span className="e" aria-hidden="true">
        {EMOJI[VALUE[dir]]}
      </span>
      <span className="display label" style={{ fontSize: dir === 'u' ? 24 : 18 }}>
        {t.names[VALUE[dir]]}
      </span>
      <span className="n">
        {ARROW[dir]} · {piles[dir].length}
      </span>
      <span className="pile">
        {piles[dir].slice(col ? -4 : -9).map((id) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={id} src={imgUrl(id)} alt="" />
        ))}
      </span>
    </button>
  )

  return (
    <div className="kompass" role="dialog" aria-modal="true" aria-label={t.toKompass}>
      <div className="corner" style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2 }}>
        <div className="display hide-m" style={{ fontSize: 18, color: 'var(--fresh)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {Math.min(i + 1, queue.length)} / {queue.length}
        </div>
      </div>
      {edge('u', false)}
      <div className="corner" style={{ justifyContent: 'flex-end' }}>
        <button className="pill" style={{ padding: 0, width: 44 }} aria-label={t.close} onClick={onClose}>
          <IconClose />
        </button>
      </div>

      {edge('l', true)}
      {cur ? (
        <button
          className="stage"
          aria-label={t.kompassHint}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={cancel}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => {
            if (e.detail === 0) toggleFav() // Tastatur
          }}
        >
          <span key={cur.id} className={`frame ${fly || 'in'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl(cur.id, 'preview')} alt={cur.name} width={cur.w} height={cur.h} draggable={false} />
            <span className="glass heart">
              <Heart on={favs.has(cur.id)} size={30} />
            </span>
          </span>
          {!used && !pie && <span className="glass glass-dk hint">{touch ? t.kompassHintTouch : t.kompassHint}</span>}
        </button>
      ) : (
        <div className="stage" style={{ cursor: 'default', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 56, lineHeight: 1 }} aria-hidden="true">
            {EMOJI[4]}
          </div>
          <div className="display" style={{ fontSize: 34 }}>
            {t.kompassDone}
          </div>
          <div style={{ color: 'var(--muted)' }}>{t.kompassDoneText}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="pill pill-solid" onClick={onClose}>
              {t.toWall}
            </button>
            <button
              className="pill"
              onClick={() => {
                setQueue(photos)
                setI(0)
              }}
            >
              {t.again}
            </button>
          </div>
        </div>
      )}
      {edge('r', true)}

      <div className="corner">
        <button className="pill hide-m" onClick={onClose}>
          ← {t.toWall}
        </button>
      </div>
      {edge('d', false)}
      <div className="corner" />

      {pie && (
        <span className="pie" style={{ left: pie.x, top: pie.y }}>
          <span className="glass glass-dk center" style={{ borderColor: pie.dir ? undefined : 'var(--heart)', borderWidth: 2 }}>
            <Heart on={!pie.dir} size={20} />
          </span>
          {(['u', 'r', 'd', 'l'] as Dir[]).map((dir) => (
            <span key={dir} className={`glass glass-dk pet p${dir}${pie.dir === dir ? ' on' : ''}`}>
              <span aria-hidden="true">{EMOJI[VALUE[dir]]}</span>
              <span className="label">{t.names[VALUE[dir]]}</span>
            </span>
          ))}
        </span>
      )}
    </div>
  )
}
