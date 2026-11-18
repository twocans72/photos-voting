'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/LanguageContext'
import { imgUrl } from '@/lib/photo'
import { SiteFooter, SiteHeader } from '@/components/ui'

interface AlbumRow {
  id: number
  title: string
  description: string | null
  asset_count: number
  cover_asset_id: string | null
  lottery_public: boolean
  rating_count: number
  is_fresh: number
}

export default function HomePage() {
  const [albums, setAlbums] = useState<AlbumRow[] | null>(null)
  const { t } = useLang()

  useEffect(() => {
    fetch('/api/albums', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setAlbums(Array.isArray(data) ? data : []))
      .catch(() => setAlbums([]))
  }, [])

  return (
    <>
      <SiteHeader />
      <main>
        <h1 className="display" style={{ fontSize: 'clamp(32px, 4.5vw, 56px)', lineHeight: 1, margin: '14px 20px 20px', color: 'var(--fresh)' }}>
          {t.albums}
        </h1>
        {albums === null ? (
          <div className="albums" aria-busy="true" aria-label={t.loading}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`album-card shimmer${i === 0 ? ' big' : ''}`} />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <p style={{ margin: '0 28px', color: 'var(--muted)' }}>{t.noAlbums}</p>
        ) : (
          <div className="albums">
            {albums.map((album, i) => (
              <Link key={album.id} href={`/album/${album.id}`} className={`album-card${i === 0 ? ' big' : ''}`}>
                {album.cover_asset_id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgUrl(album.cover_asset_id, 'preview')} alt="" loading={i < 3 ? 'eager' : 'lazy'} />
                )}
                <span className="shade" />
                <span className="chips">
                  {!!album.is_fresh && <span className="glass chip">{t.fresh}</span>}
                  {album.lottery_public && <span className="glass chip">{t.lottery}</span>}
                </span>
                <span className="meta">
                  <span className="display" style={{ display: 'block', fontSize: i === 0 ? 'clamp(30px, 4.4vw, 60px)' : 'clamp(24px, 2.4vw, 34px)', lineHeight: 1.05 }}>
                    {album.title}
                  </span>
                  <span style={{ display: 'block', marginTop: 6, fontSize: 14, color: '#d5dbe6' }}>
                    {t.photos(album.asset_count)}
                    {album.rating_count > 0 ? ` · ${t.votes(album.rating_count)}` : ''}
                    {album.description ? ` · ${album.description}` : ''}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
