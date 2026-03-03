'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Album, getVotingStatus } from '@/types'

interface AdminAlbum extends Album {
  vote_count: number
  lottery_count: number
  sort_order: number
}

export default function AdminPage() {
  const router = useRouter()
  const [albums, setAlbums] = useState<AdminAlbum[]>([])
  const albumsRef = useRef<AdminAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const dragItem = useRef<number | null>(null)

  const loadAlbums = () => {
    fetch('/api/admin/albums')
      .then(r => {
        if (r.status === 401) { router.push('/admin/login'); return [] }
        return r.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          const sorted = data.sort((a: AdminAlbum, b: AdminAlbum) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
          setAlbums(sorted)
          albumsRef.current = sorted
        }
      })
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

  const toggleField = async (album: AdminAlbum, field: string, value: boolean) => {
    await fetch(`/api/admin/albums/${album.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    loadAlbums()
  }

  const handleDragStart = (index: number) => { dragItem.current = index }

  const handleDragEnter = (index: number) => {
    if (dragItem.current === null || dragItem.current === index) return
    setAlbums(prev => {
      const arr = [...prev]
      const dragged = arr.splice(dragItem.current!, 1)[0]
      arr.splice(index, 0, dragged)
      dragItem.current = index
      albumsRef.current = arr
      return arr
    })
  }

  const handleDragEnd = async () => {
    const updates = albumsRef.current.map((album, index) => ({ id: album.id, sort_order: index }))
    await fetch('/api/admin/albums/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: updates }),
    })
    dragItem.current = null
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-3 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-2xl text-accent tracking-widest">ADMIN</h1>
          <div className="h-4 w-px bg-surface-3" />
          <Link href="/" className="text-text-muted text-sm hover:text-accent transition-colors">zur Website</Link>
        </div>
        <button onClick={handleLogout} className="text-text-muted text-sm hover:text-text-primary transition-colors">Abmelden</button>
      </header>

      <main className="px-8 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={handleSync} disabled={syncing} className="btn-primary text-sm py-2 disabled:opacity-50">
            {syncing ? 'Synchronisiere...' : 'Alben von Immich synchronisieren'}
          </button>
          {syncResult && <span className="text-green-400 text-sm">{syncResult}</span>}
          <span className="text-text-muted text-xs ml-4">Zeilen ziehen zum Sortieren</span>
        </div>

        {loading ? (
          <div className="text-text-muted animate-pulse">Laden...</div>
        ) : albums.length === 0 ? (
          <div className="text-text-muted">Keine Alben gefunden. Synchronisiere zuerst von Immich.</div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-text-muted text-xs uppercase tracking-widest">
              <div className="col-span-1"></div>
              <div className="col-span-3">Album</div>
              <div className="col-span-1 text-center">Fotos</div>
              <div className="col-span-1 text-center">Sichtbar</div>
              <div className="col-span-2 text-center">Voting</div>
              <div className="col-span-2">Zeitraum</div>
              <div className="col-span-1 text-center">Verlosung</div>
              <div className="col-span-1 text-center">Stimmen</div>
            </div>
            {albums.map((album, index) => (
              <AlbumRow
                key={album.id}
                album={album}
                onToggleVisible={() => toggleField(album, 'is_visible', !album.is_visible)}
                onToggleVoting={() => toggleField(album, 'voting_enabled', !album.voting_enabled)}
                onToggleLottery={() => toggleField(album, 'lottery_enabled', !album.lottery_enabled)}
                onUpdated={loadAlbums}
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                isDragging={dragItem.current === index}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function AlbumRow({ album, onToggleVisible, onToggleVoting, onToggleLottery, onUpdated, onDragStart, onDragEnter, onDragEnd, isDragging }: {
  album: AdminAlbum
  onToggleVisible: () => void
  onToggleVoting: () => void
  onToggleLottery: () => void
  onUpdated: () => void
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
  isDragging: boolean
}) {
  const [editingDates, setEditingDates] = useState(false)
  const [votingStart, setVotingStart] = useState(album.voting_start?.slice(0, 16) || '')
  const [votingEnd, setVotingEnd] = useState(album.voting_end?.slice(0, 16) || '')
  const status = getVotingStatus(album)

  const saveDates = async () => {
    await fetch(`/api/admin/albums/${album.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voting_start: votingStart || null, voting_end: votingEnd || null }),
    })
    setEditingDates(false)
    onUpdated()
  }

  const vStatusLabel = () => {
    if (!album.voting_enabled) return { label: 'Aus', color: 'text-text-muted' }
    if (status.isOpen) return { label: 'Offen', color: 'text-green-400' }
    if (status.hasEnded) return { label: 'Beendet', color: 'text-text-muted' }
    if (!status.hasStarted && status.startDate) return { label: 'Geplant', color: 'text-yellow-400' }
    return { label: 'Aktiv', color: 'text-green-400' }
  }
  const vs = vStatusLabel()

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      className={`grid grid-cols-12 gap-4 px-4 py-3 bg-surface-1 border items-center transition-all select-none ${isDragging ? 'opacity-40 border-accent' : 'border-surface-3'}`}
    >
      <div className="col-span-1 flex items-center gap-2">
        <span className="text-text-muted cursor-grab active:cursor-grabbing text-lg">⠿</span>
        {album.cover_asset_id && <img src={`/api/proxy/thumbnail/${album.cover_asset_id}`} alt="" className="w-8 h-8 object-cover" />}
      </div>
      <div className="col-span-3">
        <p className="text-text-primary text-sm font-medium truncate">{album.title}</p>
        <p className="text-text-muted text-xs">{album.immich_id.slice(0, 8)}...</p>
      </div>
      <div className="col-span-1 text-center text-text-secondary text-sm">{album.asset_count}</div>
      <div className="col-span-1 flex justify-center">
        <Toggle value={!!album.is_visible} onChange={onToggleVisible} />
      </div>
      <div className="col-span-2 flex flex-col items-center gap-1">
        <Toggle value={!!album.voting_enabled} onChange={onToggleVoting} />
        <span className={`text-xs ${vs.color}`}>{vs.label}</span>
      </div>
      <div className="col-span-2">
        {editingDates ? (
          <div className="space-y-1">
            <input type="datetime-local" value={votingStart} onChange={e => setVotingStart(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent" />
            <input type="datetime-local" value={votingEnd} onChange={e => setVotingEnd(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent" />
            <div className="flex gap-1">
              <button onClick={saveDates} className="text-xs bg-accent text-surface px-2 py-0.5">Speichern</button>
              <button onClick={() => setEditingDates(false)} className="text-xs border border-surface-3 text-text-muted px-2 py-0.5">Abbrechen</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditingDates(true)} className="text-left text-xs text-text-secondary hover:text-accent w-full">
            {album.voting_start ? (
              <div>
                <div>Von: {new Date(album.voting_start).toLocaleDateString('de-CH')}</div>
                {album.voting_end && <div>Bis: {new Date(album.voting_end).toLocaleDateString('de-CH')}</div>}
              </div>
            ) : <span className="text-text-muted">Kein Datum - klicken</span>}
          </button>
        )}
      </div>
      <div className="col-span-1 flex flex-col items-center gap-1">
        <Toggle value={!!album.lottery_enabled} onChange={onToggleLottery} />
        {album.lottery_enabled && <span className="text-xs text-text-muted">{album.lottery_count} TN</span>}
      </div>
      <div className="col-span-1 text-center flex flex-col items-center gap-1">
        <span className="text-accent font-display text-lg">{album.vote_count}</span>
        <Link href={`/admin/albums/${album.id}`} className="text-text-muted text-xs hover:text-accent">Detail</Link>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`w-10 h-5 relative transition-colors ${value ? 'bg-accent' : 'bg-surface-3'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-surface transition-all ${value ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}
