'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Album, getVotingStatus } from '@/types'

interface AdminAlbum extends Album {
  vote_count: number
  lottery_count: number
}

export default function AdminPage() {
  const router = useRouter()
  const [albums, setAlbums] = useState<AdminAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const loadAlbums = () => {
    fetch('/api/admin/albums')
      .then(r => {
        if (r.status === 401) { router.push('/admin/login'); return [] }
        return r.json()
      })
      .then(data => { if (Array.isArray(data)) setAlbums(data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAlbums() }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch('/api/admin/sync', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setSyncResult(`${data.synced} Alben synchronisiert`)
      loadAlbums()
    } else if (res.status === 401) {
      router.push('/admin/login')
    }
    setSyncing(false)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const toggleVisible = async (album: AdminAlbum) => {
    await fetch(`/api/admin/albums/${album.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: !album.is_visible }),
    })
    loadAlbums()
  }

  const toggleVoting = async (album: AdminAlbum) => {
    await fetch(`/api/admin/albums/${album.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voting_enabled: !album.voting_enabled }),
    })
    loadAlbums()
  }

  const toggleLottery = async (album: AdminAlbum) => {
    await fetch(`/api/admin/albums/${album.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lottery_enabled: !album.lottery_enabled }),
    })
    loadAlbums()
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Admin Header */}
      <header className="border-b border-surface-3 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-2xl text-accent tracking-widest">ADMIN</h1>
          <div className="h-4 w-px bg-surface-3" />
          <Link href="/" className="text-text-muted text-sm hover:text-accent transition-colors">
            → Zur Website
          </Link>
        </div>
        <button onClick={handleLogout} className="text-text-muted text-sm hover:text-text-primary transition-colors">
          Abmelden
        </button>
      </header>

      <main className="px-8 py-8 max-w-7xl mx-auto">
        {/* Actions */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary text-sm py-2 disabled:opacity-50"
          >
            {syncing ? '⟳ Synchronisiere…' : '⟳ Alben von Immich synchronisieren'}
          </button>
          {syncResult && <span className="text-green-400 text-sm">{syncResult}</span>}
        </div>

        {/* Albums Table */}
        {loading ? (
          <div className="text-text-muted animate-pulse">Laden…</div>
        ) : albums.length === 0 ? (
          <div className="text-text-muted">
            Keine Alben gefunden. Synchronisiere zuerst von Immich.
          </div>
        ) : (
          <div className="space-y-1">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-text-muted text-xs uppercase tracking-widest">
              <div className="col-span-3">Album</div>
              <div className="col-span-1 text-center">Fotos</div>
              <div className="col-span-1 text-center">Sichtbar</div>
              <div className="col-span-2 text-center">Voting</div>
              <div className="col-span-2">Zeitraum</div>
              <div className="col-span-1 text-center">Verlosung</div>
              <div className="col-span-1 text-center">Stimmen</div>
              <div className="col-span-1 text-center">Detail</div>
            </div>

            {albums.map(album => (
              <AlbumRow
                key={album.id}
                album={album}
                onToggleVisible={() => toggleVisible(album)}
                onToggleVoting={() => toggleVoting(album)}
                onToggleLottery={() => toggleLottery(album)}
                onUpdated={loadAlbums}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function AlbumRow({
  album,
  onToggleVisible,
  onToggleVoting,
  onToggleLottery,
  onUpdated,
}: {
  album: AdminAlbum
  onToggleVisible: () => void
  onToggleVoting: () => void
  onToggleLottery: () => void
  onUpdated: () => void
}) {
  const [editingDates, setEditingDates] = useState(false)
  const [votingStart, setVotingStart] = useState(album.voting_start?.slice(0, 16) || '')
  const [votingEnd, setVotingEnd] = useState(album.voting_end?.slice(0, 16) || '')
  const status = getVotingStatus(album)

  const saveDates = async () => {
    await fetch(`/api/admin/albums/${album.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voting_start: votingStart || null,
        voting_end: votingEnd || null,
      }),
    })
    setEditingDates(false)
    onUpdated()
  }

  const votingStatusLabel = () => {
    if (!album.voting_enabled) return { label: 'Aus', color: 'text-text-muted' }
    if (status.isOpen) return { label: '● Offen', color: 'text-green-400' }
    if (status.hasEnded) return { label: 'Beendet', color: 'text-text-muted' }
    if (!status.hasStarted && status.startDate) return { label: 'Geplant', color: 'text-yellow-400' }
    return { label: 'Aktiv', color: 'text-green-400' }
  }

  const vStatus = votingStatusLabel()

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-surface-1 border border-surface-3 hover:border-surface-3 items-center group">
      {/* Title + Cover */}
      <div className="col-span-3 flex items-center gap-3">
        {album.cover_asset_id && (
          <img
            src={`/api/proxy/thumbnail/${album.cover_asset_id}`}
            alt=""
            className="w-10 h-10 object-cover flex-shrink-0"
          />
        )}
        <div>
          <p className="text-text-primary text-sm font-medium truncate">{album.title}</p>
          <p className="text-text-muted text-xs truncate">{album.immich_id.slice(0, 8)}…</p>
        </div>
      </div>

      {/* Asset count */}
      <div className="col-span-1 text-center text-text-secondary text-sm">{album.asset_count}</div>

      {/* Visible toggle */}
      <div className="col-span-1 flex justify-center">
        <Toggle value={!!album.is_visible} onChange={onToggleVisible} />
      </div>

      {/* Voting toggle + status */}
      <div className="col-span-2 flex flex-col items-center gap-1">
        <Toggle value={!!album.voting_enabled} onChange={onToggleVoting} />
        <span className={`text-xs ${vStatus.color}`}>{vStatus.label}</span>
      </div>

      {/* Date range */}
      <div className="col-span-2">
        {editingDates ? (
          <div className="space-y-1">
            <input
              type="datetime-local"
              value={votingStart}
              onChange={e => setVotingStart(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
            <input
              type="datetime-local"
              value={votingEnd}
              onChange={e => setVotingEnd(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
            <div className="flex gap-1">
              <button onClick={saveDates} className="text-xs bg-accent text-surface px-2 py-0.5">✓</button>
              <button onClick={() => setEditingDates(false)} className="text-xs border border-surface-3 text-text-muted px-2 py-0.5">✕</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingDates(true)}
            className="text-left text-xs text-text-secondary hover:text-accent transition-colors w-full"
          >
            {album.voting_start ? (
              <div>
                <div>Von: {new Date(album.voting_start).toLocaleDateString('de-CH')}</div>
                {album.voting_end && <div>Bis: {new Date(album.voting_end).toLocaleDateString('de-CH')}</div>}
              </div>
            ) : (
              <span className="text-text-muted">Kein Datum — klicken</span>
            )}
          </button>
        )}
      </div>

      {/* Lottery toggle */}
      <div className="col-span-1 flex flex-col items-center gap-1">
        <Toggle value={!!album.lottery_enabled} onChange={onToggleLottery} />
        {album.lottery_enabled && (
          <span className="text-xs text-text-muted">
            {album.lottery_count} TN
          </span>
        )}
      </div>

      {/* Vote count */}
      <div className="col-span-1 text-center">
        <span className="text-accent font-display text-lg">{album.vote_count}</span>
      </div>

      {/* Detail link */}
      <div className="col-span-1 text-center">
        <Link
          href={`/admin/albums/${album.id}`}
          className="text-text-muted text-xs hover:text-accent transition-colors"
        >
          Detail →
        </Link>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-10 h-5 relative transition-colors ${value ? 'bg-accent' : 'bg-surface-3'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-surface transition-all ${value ? 'left-5' : 'left-0.5'}`}
      />
    </button>
  )
}
