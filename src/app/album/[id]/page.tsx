'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { communityLevels, EMOJI, Photo, Stats } from '@/lib/photo'
import { useLang } from '@/lib/LanguageContext'
import { useSession } from '@/lib/SessionContext'
import { Heart, IconArrows, IconClose, SiteFooter, SiteHeader } from '@/components/ui'
import { Wall } from '@/components/Wall'
import { Focus } from '@/components/Focus'
import { Kompass } from '@/components/Kompass'

interface AlbumInfo {
  id: number
  title: string
  description: string | null
  asset_count: number
  lottery: boolean
  lotteryUntil?: string | null
  open: boolean
}

type Mode = 'mine' | 'all'

export default function AlbumPage() {
  const id = useParams().id as string
  const { t, lang } = useLang()
  const { user, ready, openLogin } = useSession()

  const [album, setAlbum] = useState<AlbumInfo | null>(null)
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [mine, setMine] = useState<Record<string, number>>({})
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [all, setAll] = useState<Stats>({})
  const [error, setError] = useState<null | { notFound?: boolean; status?: number }>(null)
  const [mode, setMode] = useState<Mode>('mine')
  const [onlyFav, setOnlyFav] = useState(false)
  const [picked, setPicked] = useState<number[]>([]) // Filter nach Stufe (1–4); leer = alle
  const [focusId, setFocusId] = useState<string | null>(null)
  const [kompass, setKompass] = useState(false)
  const [hint, setHint] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const modeSet = useRef(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const say = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  // Bilder des Albums (einmal pro Album)
  useEffect(() => {
    let alive = true
    setPhotos(null)
    setError(null)
    fetch(`/api/albums/${id}/assets`)
      .then(async (r) => {
        if (r.status === 404) throw { notFound: true }
        const data = await r.json()
        if (!r.ok) throw { status: data.status || r.status }
        return data as Photo[]
      })
      .then((list) => {
        if (!alive) return
        setPhotos(list.sort((a, b) => a.date.localeCompare(b.date)))
      })
      .catch((e) => alive && setError(e && (e.notFound || e.status !== undefined) ? e : { status: 0 }))
    return () => {
      alive = false
    }
  }, [id])

  // Stimmen und Favoriten (neu laden, wenn sich das Konto ändert)
  const loadRatings = useCallback(async () => {
    const r = await fetch(`/api/albums/${id}/ratings`, { cache: 'no-store' })
    if (!r.ok) {
      if (r.status === 404) setError({ notFound: true })
      return
    }
    const data = await r.json()
    setAlbum(data.album)
    setMine(data.mine)
    setFavs(new Set(data.favs))
    setAll(data.all)
    if (!modeSet.current) {
      modeSet.current = true
      let saved: string | null = null
      try {
        saved = localStorage.getItem('wall-mode')
      } catch {}
      if (saved === 'mine' || saved === 'all') setMode(saved)
      else if (Object.keys(data.mine).length === 0 && data.total >= 5) setMode('all')
    }
  }, [id])

  useEffect(() => {
    if (ready) loadRatings().catch(() => {})
  }, [ready, user?.email, loadRatings])

  // Die Anleitung klappt nur beim ersten Besuch auf schmalen Bildschirmen von selbst auf;
  // auf breiten steht die Kurzform ohnehin in der Leiste.
  useEffect(() => {
    if (window.innerWidth >= 1280) return
    try {
      setHint(localStorage.getItem('hint-off') !== '1')
    } catch {
      setHint(true)
    }
  }, [])

  const closeHint = useCallback(() => {
    setHint(false)
    try {
      localStorage.setItem('hint-off', '1')
    } catch {}
  }, [])

  // Direktlink auf ein Bild: /album/3?focus=<assetId>
  useEffect(() => {
    if (!photos) return
    const wanted = new URLSearchParams(window.location.search).get('focus')
    if (wanted && photos.some((p) => p.id === wanted)) setFocusId(wanted)
  }, [photos])

  const applyLocal = useCallback((assetId: string, prev: number, value: number) => {
    setMine((m) => {
      const n = { ...m }
      if (value) n[assetId] = value
      else delete n[assetId]
      return n
    })
    setAll((a) => {
      const c = [...(a[assetId] || [0, 0, 0, 0])] as [number, number, number, number]
      if (prev) c[prev - 1] = Math.max(0, c[prev - 1] - 1)
      if (value) c[value - 1] += 1
      return { ...a, [assetId]: c }
    })
  }, [])

  const rate = useCallback(
    (assetId: string, value: number) => {
      const prev = mine[assetId] || 0
      if (prev === value) return
      applyLocal(assetId, prev, value)
      fetch(`/api/albums/${id}/ratings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId, value }) })
        .then((r) => {
          if (!r.ok) throw r.status
        })
        .catch((status) => {
          applyLocal(assetId, value, prev)
          say(status === 403 ? t.votingClosed : status === 429 ? t.tooMany : t.errorGeneric)
        })
    },
    [mine, id, applyLocal, say, t]
  )

  const toggleFav = useCallback(
    (assetId: string) => {
      if (!user) {
        openLogin('fav')
        return
      }
      const on = !favs.has(assetId)
      const flip = (to: boolean) =>
        setFavs((f) => {
          const n = new Set(f)
          if (to) n.add(assetId)
          else n.delete(assetId)
          return n
        })
      flip(on)
      fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ albumId: Number(id), assetId, on }) })
        .then(async (r) => {
          if (!r.ok) throw r.status
          const data = await r.json()
          // Ein Herz auf einem unbewerteten Bild hat serverseitig «Love it» gesetzt
          if (data.rating) applyLocal(assetId, 0, data.rating)
        })
        .catch(() => {
          flip(!on)
          say(t.errorGeneric)
        })
    },
    [user, favs, id, openLogin, applyLocal, say, t]
  )

  const pickMode = (m: Mode) => {
    setMode(m)
    try {
      localStorage.setItem('wall-mode', m)
    } catch {}
  }

  const levels = useMemo(() => (mode === 'mine' || !photos ? mine : communityLevels(photos, all)), [mode, mine, photos, all])
  // Herz UND Stufe; mehrere gewählte Stufen ergänzen sich (ein Foto hat nur eine)
  const shown = useMemo(
    () => (photos || []).filter((p) => (!onlyFav || favs.has(p.id)) && (picked.length === 0 || picked.includes(levels[p.id] || 0))),
    [photos, onlyFav, favs, picked, levels]
  )
  // Wie viele Fotos je Stufe (in der gerade gewählten Wand), für die Filterleiste
  const perLevel = useMemo(() => {
    const n = [0, 0, 0, 0, 0]
    for (const p of photos || []) n[levels[p.id] || 0]++
    return n
  }, [photos, levels])
  const total = useMemo(() => Object.values(all).reduce((s, c) => s + c[0] + c[1] + c[2] + c[3], 0), [all])
  const focusIndex = focusId ? shown.findIndex((p) => p.id === focusId) : -1
  const canRate = !!album?.open

  if (error?.notFound) {
    return (
      <>
        <SiteHeader />
        <main className="page">
          <h1 className="display">{t.albumNotFound}</h1>
          <Link className="pill" href="/">
            ← {t.allAlbums}
          </Link>
        </main>
      </>
    )
  }

  return (
    <>
      <SiteHeader hideFavLink title={album?.title}>
        {canRate && photos && photos.length > 0 && (
          <>
            <span className="legend" aria-hidden="true">
              {t.hintTap} <span className="e">{EMOJI[1]}</span> <i>·</i> {t.hintHold} <span className="e">{EMOJI[2]} {EMOJI[3]} {EMOJI[4]}</span>
            </span>
            <button
              className="pill icon help"
              aria-label={t.howToRate}
              aria-expanded={hint}
              onClick={() => (hint ? closeHint() : setHint(true))}
            >
              ?
            </button>
          </>
        )}
        <span className="seg" role="group">
          <button aria-pressed={mode === 'all'} onClick={() => pickMode('all')}>
            <span className="long">{t.wallAll}</span>
            <span className="short">{t.wallAllShort}</span>
          </button>
          <button aria-pressed={mode === 'mine'} onClick={() => pickMode('mine')}>
            <span className="long">{t.wallMine}</span>
            <span className="short">{t.wallMineShort}</span>
          </button>
        </span>
        <span className="filters" role="group" aria-label={t.filter}>
          <button
            aria-pressed={onlyFav}
            aria-label={`${t.favorites}: ${favs.size}`}
            title={t.favorites}
            onClick={() => {
              if (!user) openLogin('fav')
              else setOnlyFav((on) => !on)
            }}
          >
            <Heart on={onlyFav || favs.size > 0} size={16} />
            <span className="n">{favs.size}</span>
          </button>
          {[1, 2, 3, 4].map((v) => (
            <button
              key={v}
              aria-pressed={picked.includes(v)}
              aria-label={`${t.names[v]}: ${perLevel[v]}`}
              title={t.names[v]}
              onClick={() => setPicked((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))}
            >
              <span className="e" aria-hidden="true">
                {EMOJI[v]}
              </span>
              <span className="n">{perLevel[v]}</span>
            </button>
          ))}
        </span>
        {canRate && photos && photos.length > 0 && (
          <button className="pill" aria-label={t.toKompass} title={t.toKompass} onClick={() => setKompass(true)}>
            <IconArrows size={18} />
            <span className="txt wide">{t.kompassShort}</span>
          </button>
        )}
      </SiteHeader>

      <div className="album-hero">
        <Link href="/" className="back">
          ← {t.allAlbums}
        </Link>
        <h1 className="display">{album?.title || ' '}</h1>
        <div className="meta">
          {photos && (
            <span>
              {t.photos(photos.length)} · {t.shapedBy(total)}
            </span>
          )}
          {album?.description && <span style={{ color: '#d5dbe6' }}>{album.description}</span>}
          {album?.lottery && (
            <span>
              {album.lotteryUntil
                ? t.lotteryNoteUntil(new Date(album.lotteryUntil + 'T12:00:00').toLocaleDateString(lang === 'de' ? 'de-CH' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
                : t.lotteryNote}
            </span>
          )}
          {album && !album.open && <span>{t.votingClosed}</span>}
        </div>
      </div>

      <main>
        {error ? (
          <div className="page">
            <p>{t.assetsLoadError}</p>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>{error.status === 403 ? t.assetsLoadHint403 : error.status ? t.assetsLoadStatus(error.status) : ''}</p>
          </div>
        ) : !photos ? (
          <div className="albums" aria-busy="true" aria-label={t.loading}>
            {[...Array(9)].map((_, i) => (
              <div key={i} className="album-card shimmer" />
            ))}
          </div>
        ) : shown.length === 0 && (onlyFav || picked.length > 0) ? (
          <div className="page">
            <p>{picked.length > 0 ? t.noneMatch : t.noFavsHere}</p>
          </div>
        ) : (
          <Wall photos={shown} levels={levels} mine={mine} favs={favs} canRate={canRate} onRate={rate} onFav={toggleFav} onFocus={setFocusId} />
        )}
      </main>
      <SiteFooter />

      {hint && canRate && photos && photos.length > 0 && !kompass && focusIndex < 0 && (
        <div className="glass glass-dk howto" role="dialog" aria-label={t.howToRate}>
          <button className="x" aria-label={t.hintDismiss} onClick={closeHint}>
            <IconClose size={16} />
          </button>
          <div>
            <b>{t.hintTap}</b> {EMOJI[1]} {t.names[1]}
          </div>
          <div>
            <b>{t.hintHold}</b> {EMOJI[2]} {t.names[2]} → {EMOJI[3]} {t.names[3]} → {EMOJI[4]} {t.names[4]}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <b>{t.hintHeart}</b> <Heart on={false} size={16} /> {t.hintFav}
          </div>
        </div>
      )}

      {focusIndex >= 0 && (
        <Focus
          photos={shown}
          index={focusIndex}
          setIndex={(i) => setFocusId(shown[i].id)}
          onClose={() => setFocusId(null)}
          mine={mine}
          favs={favs}
          all={all}
          canRate={canRate}
          onRate={rate}
          onFav={toggleFav}
        />
      )}

      {kompass && photos && (
        <Kompass title={album?.title || ''} photos={photos} mine={mine} favs={favs} onRate={rate} onFav={toggleFav} onClose={() => setKompass(false)} />
      )}

      {toast && (
        <div className="glass glass-dk toast" role="status">
          {toast}
        </div>
      )}
    </>
  )
}
