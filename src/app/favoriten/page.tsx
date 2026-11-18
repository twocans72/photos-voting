'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import { useSession } from '@/lib/SessionContext'
import { EMOJI, imgUrl } from '@/lib/photo'
import { SiteFooter, SiteHeader } from '@/components/ui'

interface FavRow {
  asset_id: string
  album_id: number
  album_title: string
  value: number | null
}

/** Alle Favoriten des Kontos, nach Album gruppiert. Ein Klick öffnet das Bild im Fokus-Modus seines Albums. */
export default function FavoritesPage() {
  const { t } = useLang()
  const { user, ready, openLogin } = useSession()
  const [rows, setRows] = useState<FavRow[] | null>(null)

  useEffect(() => {
    if (!ready || !user) return
    fetch('/api/favorites', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
  }, [ready, user])

  const groups = useMemo(() => {
    const map = new Map<number, { title: string; items: FavRow[] }>()
    for (const r of rows || []) {
      if (!map.has(r.album_id)) map.set(r.album_id, { title: r.album_title, items: [] })
      map.get(r.album_id)!.items.push(r)
    }
    return Array.from(map.entries())
  }, [rows])

  return (
    <>
      <SiteHeader hideFavLink />
      <main>
        <h1 className="display" style={{ fontSize: 'clamp(38px, 6vw, 72px)', lineHeight: 1, margin: '18px 28px 26px', color: 'var(--fresh)' }}>
          {t.favoritesTitle}
        </h1>
        {!ready ? (
          <p style={{ margin: '0 28px' }}>{t.loading}</p>
        ) : !user ? (
          <div style={{ margin: '0 28px' }}>
            <p style={{ color: '#d5dbe6' }}>{t.favoritesLogin}</p>
            <p style={{ marginTop: 18 }}>
              <button className="pill pill-solid" onClick={() => openLogin('fav')}>
                {t.signIn}
              </button>
            </p>
          </div>
        ) : rows === null ? (
          <p style={{ margin: '0 28px' }}>{t.loading}</p>
        ) : rows.length === 0 ? (
          <div style={{ margin: '0 28px' }}>
            <p style={{ color: '#d5dbe6' }}>{t.favoritesEmpty}</p>
            <p style={{ marginTop: 18 }}>
              <Link className="pill" href="/">
                {t.toAlbums}
              </Link>
            </p>
          </div>
        ) : (
          groups.map(([albumId, group]) => (
            <section key={albumId} style={{ marginBottom: 36 }}>
              <h2 style={{ margin: '0 28px 12px', fontSize: 20, fontWeight: 700 }}>
                <Link href={`/album/${albumId}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                  {group.title} →
                </Link>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 4, padding: '0 4px' }}>
                {group.items.map((f) => (
                  <Link key={f.asset_id} href={`/album/${albumId}?focus=${f.asset_id}`} className="tile" style={{ aspectRatio: '4 / 3', display: 'block' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl(f.asset_id, 'preview')} alt="" loading="lazy" />
                    {f.value ? (
                      <span className="glass badge" aria-label={t.names[f.value]}>
                        {EMOJI[f.value]}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
      <SiteFooter />
    </>
  )
}
