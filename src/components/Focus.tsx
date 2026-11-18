'use client'

import { useEffect, useRef } from 'react'
import { EMOJI, exifLine, imgUrl, Photo, Stats } from '@/lib/photo'
import { useLang } from '@/lib/LanguageContext'
import { Heart, IconClose, IconNext, IconPrev } from './ui'

interface Props {
  photos: Photo[]
  index: number
  setIndex: (i: number) => void
  onClose: () => void
  mine: Record<string, number>
  favs: Set<string>
  all: Stats
  canRate: boolean
  onRate: (id: string, value: number) => void
  onFav: (id: string) => void
}

/** Fokus-Modus: ein Bild gross im Vordergrund, die Wand dahinter wird unscharf. */
export function Focus({ photos, index, setIndex, onClose, mine, favs, all, canRate, onRate, onFav }: Props) {
  const { t } = useLang()
  const photo = photos[index]
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const go = (d: number) => setIndex((index + d + photos.length) % photos.length)

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
      else if (canRate && ['1', '2', '3', '4'].includes(e.key)) onRate(photo.id, Number(e.key))
      else if (e.key === 'f' || e.key === 'F') onFav(photo.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!photo) return null
  const my = mine[photo.id] || 0
  const fav = favs.has(photo.id)
  const counts = all[photo.id]
  const total = counts ? counts[0] + counts[1] + counts[2] + counts[3] : 0
  const caption = [exifLine(photo), total ? t.votes(total) : null].filter(Boolean).join(' · ')

  return (
    <div className="focus" role="dialog" aria-modal="true" aria-label={t.tileUnrated(index + 1)}>
      <button className="scrim" aria-label={t.focusClose} onClick={onClose} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={photo.id}
        className="photo"
        src={imgUrl(photo.id, 'preview')}
        alt={photo.name}
        width={photo.w}
        height={photo.h}
        draggable={false}
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = swipe.current
          swipe.current = null
          if (!s) return
          const dx = e.clientX - s.x
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(dx < 0 ? 1 : -1)
        }}
      />
      <div className="bar">
        <button className="glass fround" aria-label={t.prev} onClick={() => go(-1)}>
          <IconPrev />
        </button>
        {canRate &&
          [1, 2, 3, 4].map((v) => (
            <button key={v} className={`glass fbtn${my === v ? ' on' : ''}`} aria-pressed={my === v} onClick={() => onRate(photo.id, my === v ? 0 : v)}>
              <span className="e" aria-hidden="true">
                {EMOJI[v]}
              </span>
              <span className="l">{t.names[v]}</span>
            </button>
          ))}
        <button className="glass fround" aria-label={fav ? t.favRemove : t.favAdd} aria-pressed={fav} onClick={() => onFav(photo.id)}>
          <Heart on={fav} />
        </button>
        <button className="glass fround" aria-label={t.next} onClick={() => go(1)}>
          <IconNext />
        </button>
      </div>
      {caption && <div className="caption">{caption}</div>}
      <button className="glass fround close" aria-label={t.focusClose} onClick={onClose}>
        <IconClose />
      </button>
    </div>
  )
}
