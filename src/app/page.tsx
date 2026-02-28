'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Album, getVotingStatus } from '@/types'

interface AlbumWithStats extends Album {
  vote_count?: number
}

export default function HomePage() {
  const [albums, setAlbums] = useState<AlbumWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/albums')
      .then(r => r.json())
      .then(data => { setAlbums(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="grain min-h-screen">
      {/* Header */}
      <header className="border-b border-surface-3 px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-light tracking-widest text-accent">
            PEDUZZI
          </h1>
          <p className="text-text-muted text-xs tracking-[0.3em] uppercase mt-0.5">Photos</p>
        </div>
      </header>

      <main className="px-8 py-12 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/3] shimmer" />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-32 text-text-muted">
            <p className="font-display text-4xl font-light mb-3">Keine Alben</p>
            <p className="text-sm">Noch keine Alben veröffentlicht.</p>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <h2 className="font-display text-5xl font-light text-text-primary">Alben</h2>
              <div className="w-12 h-px bg-accent mt-3" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
              {albums.map((album, i) => (
                <AlbumCard key={album.id} album={album} index={i} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function AlbumCard({ album, index }: { album: AlbumWithStats; index: number }) {
  const status = getVotingStatus(album)
  const thumbUrl = album.cover_asset_id
    ? `/api/proxy/thumbnail/${album.cover_asset_id}?size=preview`
    : null

  return (
    <Link
      href={`/album/${album.id}`}
      className="group relative block overflow-hidden bg-surface-1 hover:z-10"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-surface-2">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={album.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-text-muted text-4xl">◻</span>
          </div>
        )}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
        <p className="font-display text-xl text-white font-light">{album.title}</p>
        <p className="text-white/60 text-xs mt-1">{album.asset_count} Fotos</p>
      </div>

      {/* Static label */}
      <div className="p-4 group-hover:opacity-0 transition-opacity duration-200">
        <p className="font-display text-lg text-text-primary">{album.title}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-text-muted text-xs">{album.asset_count} Fotos</span>
          {status.isOpen && (
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 border border-accent/30">
              Voting offen
            </span>
          )}
          {status.hasEnded && album.voting_enabled ? (
            <span className="text-xs text-text-muted">Voting beendet</span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
