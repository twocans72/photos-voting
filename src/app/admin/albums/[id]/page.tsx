'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Vote {
  id: number
  rank1_asset_id: string
  rank2_asset_id: string | null
  rank3_asset_id: string | null
  name: string | null
  email: string | null
  created_at: string
  is_winner: number | null
}

interface LotteryParticipant {
  id: number
  email: string
  name: string | null
  is_winner: number
  rank1_asset_id: string
  created_at: string
}

interface AlbumDetail {
  id: number
  title: string
  lottery_enabled: number
  lottery_drawn: number
  lottery_winner_id: string | null
  vote_count: number
  lottery_count: number
}

export default function AdminAlbumDetailPage() {
  const params = useParams()
  const router = useRouter()
  const albumId = params.id as string

  const [album, setAlbum] = useState<AlbumDetail | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [participants, setParticipants] = useState<LotteryParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [tab, setTab] = useState<'votes' | 'lottery'>('votes')

  const load = async () => {
    const [albumRes, votesRes] = await Promise.all([
      fetch(`/api/admin/albums/${albumId}`),
      fetch(`/api/admin/albums/${albumId}/votes`),
    ])
    if (albumRes.status === 401) { router.push('/admin/login'); return }

    const albumData = await albumRes.json()
    const votesData = await votesRes.json()

    setAlbum(albumData)
    setVotes(Array.isArray(votesData) ? votesData : [])

    if (albumData.lottery_enabled) {
      const lotteryRes = await fetch(`/api/admin/lottery/${albumId}`)
      const lotteryData = await lotteryRes.json()
      setParticipants(Array.isArray(lotteryData) ? lotteryData : [])
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [albumId])

  const handleDrawLottery = async () => {
    if (!confirm('Jetzt Gewinner ziehen? Dies kann nicht rückgängig gemacht werden.')) return
    setDrawing(true)
    const res = await fetch(`/api/admin/lottery/${albumId}`, { method: 'POST' })
    if (res.ok) {
      await load()
    } else {
      const err = await res.json()
      alert(err.error || 'Fehler beim Ziehen')
    }
    setDrawing(false)
  }

  const exportCSV = () => {
    const rows = [
      ['Name', 'Email', 'Platz 1', 'Platz 2', 'Platz 3', 'Datum', 'Gewinner'],
      ...votes.map(v => [
        v.name || '',
        v.email || '',
        v.rank1_asset_id,
        v.rank2_asset_id || '',
        v.rank3_asset_id || '',
        new Date(v.created_at).toLocaleString('de-CH'),
        v.is_winner ? 'Ja' : '',
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `votes-album-${albumId}.csv`
    a.click()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-text-muted">Laden…</div>
  if (!album) return <div className="min-h-screen flex items-center justify-center text-text-muted">Nicht gefunden</div>

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-3 px-8 py-5 flex items-center gap-4">
        <Link href="/admin" className="text-text-muted hover:text-accent transition-colors text-sm">← Dashboard</Link>
        <div className="h-4 w-px bg-surface-3" />
        <h1 className="font-display text-xl text-text-primary">{album.title}</h1>
      </header>

      <main className="px-8 py-8 max-w-6xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Stimmen" value={votes.length} />
          <StatCard label="Mit Email" value={votes.filter(v => v.email).length} />
          <StatCard label="Verlosungs-TN" value={participants.length} />
          <StatCard label="Gewinner gezogen" value={album.lottery_drawn ? 'Ja' : 'Nein'} />
        </div>

        {/* Lottery Winner Banner */}
        {album.lottery_drawn && album.lottery_winner_id && (
          <div className="mb-8 p-5 border border-yellow-500/40 bg-yellow-900/10">
            <p className="font-display text-2xl text-yellow-400">🎉 Gewinner</p>
            <p className="text-text-primary mt-1 text-lg">{album.lottery_winner_id}</p>
            {participants.find(p => p.is_winner) && (
              <p className="text-text-muted text-sm mt-1">
                Name: {participants.find(p => p.is_winner)?.name || '—'}
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b border-surface-3">
          {(['votes', 'lottery'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {t === 'votes' ? `Stimmen (${votes.length})` : `Verlosung (${participants.length})`}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 pb-2">
            <button onClick={exportCSV} className="btn-secondary text-xs py-1.5 px-4">
              CSV Export
            </button>
            {album.lottery_enabled && !album.lottery_drawn && participants.length > 0 && (
              <button
                onClick={handleDrawLottery}
                disabled={drawing}
                className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
              >
                {drawing ? '…' : '🎲 Gewinner ziehen'}
              </button>
            )}
          </div>
        </div>

        {tab === 'votes' && (
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs text-text-muted uppercase tracking-widest">
              <div className="col-span-2">Name</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Platz 1</div>
              <div className="col-span-2">Platz 2</div>
              <div className="col-span-2">Platz 3</div>
              <div className="col-span-1">Datum</div>
            </div>
            {votes.map(vote => (
              <div key={vote.id} className={`grid grid-cols-12 gap-3 px-3 py-2 bg-surface-1 border text-sm items-center ${
                vote.is_winner ? 'border-yellow-500/40 bg-yellow-900/5' : 'border-surface-3'
              }`}>
                <div className="col-span-2 text-text-primary truncate">
                  {vote.is_winner && <span className="mr-1">🏆</span>}
                  {vote.name || <span className="text-text-muted italic">Anonym</span>}
                </div>
                <div className="col-span-3 text-text-secondary truncate">{vote.email || '—'}</div>
                <div className="col-span-2">
                  <img src={`/api/proxy/thumbnail/${vote.rank1_asset_id}`} alt="" className="w-10 h-10 object-cover" />
                </div>
                <div className="col-span-2">
                  {vote.rank2_asset_id
                    ? <img src={`/api/proxy/thumbnail/${vote.rank2_asset_id}`} alt="" className="w-10 h-10 object-cover" />
                    : <span className="text-text-muted">—</span>}
                </div>
                <div className="col-span-2">
                  {vote.rank3_asset_id
                    ? <img src={`/api/proxy/thumbnail/${vote.rank3_asset_id}`} alt="" className="w-10 h-10 object-cover" />
                    : <span className="text-text-muted">—</span>}
                </div>
                <div className="col-span-1 text-text-muted text-xs">
                  {new Date(vote.created_at).toLocaleDateString('de-CH')}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'lottery' && (
          <div className="space-y-1">
            {participants.length === 0 ? (
              <p className="text-text-muted py-8 text-center">Noch keine Teilnehmer</p>
            ) : (
              participants.map(p => (
                <div key={p.id} className={`flex items-center gap-4 px-4 py-3 bg-surface-1 border text-sm ${
                  p.is_winner ? 'border-yellow-500/40' : 'border-surface-3'
                }`}>
                  <img src={`/api/proxy/thumbnail/${p.rank1_asset_id}`} alt="" className="w-10 h-10 object-cover" />
                  <div className="flex-1">
                    <p className="text-text-primary">{p.name || <span className="text-text-muted italic">Kein Name</span>}</p>
                    <p className="text-text-secondary text-xs">{p.email}</p>
                  </div>
                  {p.is_winner && <span className="text-yellow-400">🏆 Gewinner</span>}
                  <span className="text-text-muted text-xs">{new Date(p.created_at).toLocaleDateString('de-CH')}</span>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-surface-1 border border-surface-3 p-4">
      <p className="text-text-muted text-xs uppercase tracking-widest mb-1">{label}</p>
      <p className="font-display text-3xl text-accent">{value}</p>
    </div>
  )
}
