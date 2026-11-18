'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface AssetStat {
  asset_id: string
  n: number
  avg: number
  c1: number
  c2: number
  c3: number
  c4: number
  favs: number
}

interface Participant {
  id: number
  email: string
  ratings: number
  first_at: number
  is_winner: number
}

interface AlbumDetail {
  id: number
  title: string
  lottery_enabled: number
  lottery_drawn: number
  lottery_winner_id: string | null
  vote_count: number
  lottery_count: number
  voter_count: number
}

const LABELS = ['🤷 Nicht meins', '👍 OK', '🤜🤛 Gutes Foto', '😍 Love it']

export default function AdminAlbumDetailPage() {
  const params = useParams()
  const router = useRouter()
  const albumId = params.id as string

  const [album, setAlbum] = useState<AlbumDetail | null>(null)
  const [stats, setStats] = useState<AssetStat[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [tab, setTab] = useState<'photos' | 'lottery'>('photos')

  const load = async () => {
    const [albumRes, statsRes, lotteryRes] = await Promise.all([
      fetch(`/api/admin/albums/${albumId}`),
      fetch(`/api/admin/albums/${albumId}/votes`),
      fetch(`/api/admin/lottery/${albumId}`),
    ])
    if (albumRes.status === 401) {
      router.push('/admin/login')
      return
    }
    const statsData = await statsRes.json()
    const lotteryData = await lotteryRes.json()
    setAlbum(await albumRes.json())
    setStats(Array.isArray(statsData) ? statsData : [])
    setParticipants(Array.isArray(lotteryData) ? lotteryData : [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId])

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
      ['Bild', 'Stimmen', 'Schnitt', 'Nicht meins', 'OK', 'Gutes Foto', 'Love it', 'Favoriten'],
      ...stats.map((s) => [s.asset_id, s.n, s.avg, s.c1, s.c2, s.c3, s.c4, s.favs]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stimmen-album-${albumId}.csv`
    a.click()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-text-muted">Laden…</div>
  if (!album) return <div className="min-h-screen flex items-center justify-center text-text-muted">Nicht gefunden</div>

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-3 px-8 py-5 flex items-center gap-4">
        <Link href="/admin" className="text-text-muted hover:text-accent transition-colors text-sm">
          ← Dashboard
        </Link>
        <div className="h-4 w-px bg-surface-3" />
        <h1 className="font-display text-xl text-text-primary">{album.title}</h1>
      </header>

      <main className="px-8 py-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Stimmen" value={album.vote_count} />
          <StatCard label="Personen / Geräte" value={album.voter_count} />
          <StatCard label="Verlosungs-TN" value={participants.length} />
          <StatCard label="Gewinner gezogen" value={album.lottery_drawn ? 'Ja' : 'Nein'} />
        </div>

        {!!album.lottery_drawn && album.lottery_winner_id && (
          <div className="mb-8 p-5 border border-yellow-500/40 bg-yellow-900/10">
            <p className="font-display text-2xl text-yellow-400">🎉 Gewinner</p>
            <p className="text-text-primary mt-1 text-lg">{album.lottery_winner_id}</p>
          </div>
        )}

        <div className="flex gap-0 mb-6 border-b border-surface-3">
          {(['photos', 'lottery'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {t === 'photos' ? `Bilder (${stats.length} bewertet)` : `Verlosung (${participants.length})`}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 pb-2">
            <button onClick={exportCSV} className="btn-secondary text-xs py-1.5 px-4">
              CSV Export
            </button>
            {!!album.lottery_enabled && !album.lottery_drawn && participants.length > 0 && (
              <button onClick={handleDrawLottery} disabled={drawing} className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50">
                {drawing ? '…' : '🎲 Gewinner ziehen'}
              </button>
            )}
          </div>
        </div>

        {tab === 'photos' && (
          <div className="space-y-1">
            {stats.length === 0 ? (
              <p className="text-text-muted py-8 text-center">Noch keine Stimmen</p>
            ) : (
              stats.map((s, i) => (
                <div key={s.asset_id} className="flex items-center gap-4 px-3 py-2 bg-surface-1 border border-surface-3 text-sm">
                  <span className="w-8 text-text-muted text-right">{i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/proxy/thumbnail/${s.asset_id}`} alt="" className="w-16 h-12 object-cover" />
                  <span className="font-display text-xl text-accent w-14">{Number(s.avg).toFixed(2)}</span>
                  <span className="text-text-secondary w-24">{s.n} Stimmen</span>
                  <span className="flex-1 flex flex-wrap gap-x-4 gap-y-1 text-text-secondary">
                    {[s.c1, s.c2, s.c3, s.c4].map((c, j) => (
                      <span key={j} className={c ? 'text-text-primary' : 'text-text-muted'}>
                        {LABELS[j]}: {c}
                      </span>
                    ))}
                  </span>
                  <span className="text-text-secondary whitespace-nowrap">♥ {s.favs}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'lottery' && (
          <div className="space-y-1">
            <p className="text-text-muted text-sm pb-3">Teilnahmeberechtigt ist, wer angemeldet mindestens ein Bild dieses Albums bewertet hat.</p>
            {participants.length === 0 ? (
              <p className="text-text-muted py-8 text-center">Noch keine Teilnehmer</p>
            ) : (
              participants.map((p) => (
                <div key={p.id} className={`flex items-center gap-4 px-4 py-3 bg-surface-1 border text-sm ${p.is_winner ? 'border-yellow-500/40' : 'border-surface-3'}`}>
                  <div className="flex-1">
                    <p className="text-text-primary">{p.email}</p>
                    <p className="text-text-secondary text-xs">{p.ratings} Stimmen</p>
                  </div>
                  {!!p.is_winner && <span className="text-yellow-400">🏆 Gewinner</span>}
                  <span className="text-text-muted text-xs">{new Date(p.first_at).toLocaleDateString('de-CH')}</span>
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
