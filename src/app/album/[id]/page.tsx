'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Album, getVotingStatus, VoteStats } from '@/types'
import type { ImmichAsset } from '@/lib/immich'

type PickSlot = 1 | 2 | 3

interface AlbumWithStatus extends Album {
  votingStatus?: ReturnType<typeof getVotingStatus>
}

interface ExistingVote {
  rank1_asset_id: string
  rank2_asset_id: string | null
  rank3_asset_id: string | null
}

export default function AlbumPage() {
  const params = useParams()
  const albumId = params.id as string

  const [album, setAlbum] = useState<AlbumWithStatus | null>(null)
  const [assets, setAssets] = useState<ImmichAsset[]>([])
  const [picks, setPicks] = useState<Record<PickSlot, string | null>>({ 1: null, 2: null, 3: null })
  const [stats, setStats] = useState<{ totalVotes: number; stats: VoteStats[] } | null>(null)
  const [existingVote, setExistingVote] = useState<ExistingVote | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showLotteryForm, setShowLotteryForm] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [activeRank, setActiveRank] = useState<PickSlot>(1)

  useEffect(() => {
    Promise.all([
      fetch(`/api/albums`).then(r => r.json()),
      fetch(`/api/albums/${albumId}/assets`).then(r => r.json()),
      fetch(`/api/albums/${albumId}/votes`).then(r => r.json()),
      fetch(`/api/albums/${albumId}/stats`).then(r => r.json()),
    ]).then(([albums, assets, voteStatus, statsData]) => {
      const found = (albums as Album[]).find(a => a.id === parseInt(albumId))
      if (found) {
        setAlbum({ ...found, votingStatus: getVotingStatus(found) })
      }
      if (Array.isArray(assets)) setAssets(assets)
      if (voteStatus.voted && voteStatus.vote) {
        setExistingVote(voteStatus.vote)
        setPicks({
          1: voteStatus.vote.rank1_asset_id,
          2: voteStatus.vote.rank2_asset_id,
          3: voteStatus.vote.rank3_asset_id,
        })
        setSubmitted(true)
      }
      if (statsData.stats) setStats(statsData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [albumId])

  const handlePickPhoto = useCallback((assetId: string) => {
    if (!album?.votingStatus?.isOpen || submitted) return

    setPicks(prev => {
      // If already picked at some rank, remove it
      const existingSlot = (Object.entries(prev) as [string, string | null][])
        .find(([, v]) => v === assetId)
      if (existingSlot) {
        return { ...prev, [parseInt(existingSlot[0]) as PickSlot]: null }
      }
      // Assign to current activeRank if empty, else find next empty slot
      if (!prev[activeRank]) {
        return { ...prev, [activeRank]: assetId }
      }
      const nextEmpty = ([1, 2, 3] as PickSlot[]).find(r => !prev[r])
      if (!nextEmpty) return prev // all slots full
      setActiveRank(nextEmpty)
      return { ...prev, [nextEmpty]: assetId }
    })
  }, [album, submitted, activeRank])

  const handleSubmit = async () => {
    if (!picks[1]) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/albums/${albumId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rank1: picks[1],
          rank2: picks[2] || undefined,
          rank3: picks[3] || undefined,
          email: email || undefined,
          name: name || undefined,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
        setShowLotteryForm(false)
        // Refresh stats
        const statsData = await fetch(`/api/albums/${albumId}/stats`).then(r => r.json())
        if (statsData.stats) setStats(statsData)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getRankForAsset = (assetId: string): PickSlot | null => {
    for (const rank of [1, 2, 3] as PickSlot[]) {
      if (picks[rank] === assetId) return rank
    }
    return null
  }

  const getStatsForAsset = (assetId: string) => {
    return stats?.stats.find(s => s.asset_id === assetId)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-text-muted font-display text-2xl animate-pulse">Laden…</div>
    </div>
  )

  if (!album) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-text-muted">Album nicht gefunden</div>
    </div>
  )

  const votingStatus = album.votingStatus!
  const picksCount = [picks[1], picks[2], picks[3]].filter(Boolean).length

  return (
    <div className="grain min-h-screen">
      {/* Header */}
      <header className="border-b border-surface-3 px-8 py-5 flex items-center gap-6">
        <Link href="/" className="text-text-muted hover:text-accent transition-colors text-sm">
          ← Zurück
        </Link>
        <div className="h-4 w-px bg-surface-3" />
        <div>
          <h1 className="font-display text-2xl font-light text-text-primary">{album.title}</h1>
          {album.description && <p className="text-text-muted text-xs mt-0.5">{album.description}</p>}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Voting Status Banner */}
        {votingStatus.isOpen && !submitted && (
          <div className="mb-8 p-5 border border-accent/30 bg-accent/5">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <p className="font-display text-xl text-accent">Wähle deine Top 3 Fotos</p>
                <p className="text-text-secondary text-sm mt-1">
                  Klicke auf ein Foto um es auszuwählen.
                  {votingStatus.endDate && (
                    <span className="ml-2 text-text-muted">
                      Voting endet am {new Date(votingStatus.endDate).toLocaleDateString('de-CH', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </span>
                  )}
                </p>
              </div>

              {/* Rank Selector */}
              <div className="flex gap-2">
                {([1, 2, 3] as PickSlot[]).map(rank => (
                  <button
                    key={rank}
                    onClick={() => setActiveRank(rank)}
                    className={`w-12 h-12 flex flex-col items-center justify-center transition-all border ${
                      activeRank === rank
                        ? rank === 1 ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                        : rank === 2 ? 'border-gray-300 bg-gray-300/10 text-gray-300'
                        : 'border-amber-600 bg-amber-600/10 text-amber-600'
                        : 'border-surface-3 text-text-muted hover:border-text-muted'
                    }`}
                  >
                    <span className="text-xs leading-none">{['🥇','🥈','🥉'][rank-1]}</span>
                    {picks[rank] ? (
                      <span className="text-[10px] mt-0.5 opacity-70">✓</span>
                    ) : (
                      <span className="text-[10px] mt-0.5 opacity-40">leer</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit area */}
            {picksCount > 0 && (
              <div className="mt-4 pt-4 border-t border-surface-3">
                {!showLotteryForm ? (
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="text-sm text-text-secondary">
                      {picksCount === 3 ? 'Alle 3 Plätze gewählt' : `${picksCount}/3 gewählt`}
                      {picks[1] && <span className="text-text-muted ml-2">(Mindestens Platz 1 erforderlich)</span>}
                    </div>
                    {album.lottery_enabled ? (
                      <button onClick={() => setShowLotteryForm(true)} className="btn-primary text-sm py-2">
                        Weiter & Verlosung
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={!picks[1] || submitting}
                        className="btn-primary text-sm py-2 disabled:opacity-40"
                      >
                        {submitting ? 'Wird gespeichert…' : 'Abstimmen'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-surface-2 p-5 border border-surface-3 max-w-md">
                    <p className="font-display text-lg text-accent mb-1">An der Verlosung teilnehmen</p>
                    <p className="text-text-secondary text-sm mb-4">
                      Optonal: Hinterlasse deine E-Mail, um die Chance zu haben, dein Lieblingsfoto als Druck zu erhalten.
                    </p>
                    <input
                      type="text"
                      placeholder="Name (optional)"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-surface-1 border border-surface-3 px-4 py-2.5 text-sm text-text-primary placeholder-text-muted mb-3 focus:outline-none focus:border-accent"
                    />
                    <input
                      type="email"
                      placeholder="E-Mail Adresse"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-surface-1 border border-surface-3 px-4 py-2.5 text-sm text-text-primary placeholder-text-muted mb-4 focus:outline-none focus:border-accent"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn-primary text-sm py-2 flex-1"
                      >
                        {submitting ? 'Wird gespeichert…' : email ? 'Abstimmen & Teilnehmen' : 'Nur abstimmen'}
                      </button>
                      <button
                        onClick={() => setShowLotteryForm(false)}
                        className="btn-secondary text-sm py-2"
                      >
                        Zurück
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {submitted && (
          <div className="mb-8 p-5 border border-green-800/40 bg-green-900/10">
            <p className="font-display text-xl text-green-400">Danke für deine Stimme!</p>
            <p className="text-text-secondary text-sm mt-1">
              Deine Auswahl wurde gespeichert. Unten siehst du die aktuellen Ergebnisse.
            </p>
          </div>
        )}

        {votingStatus.hasEnded && (
          <div className="mb-8 p-5 border border-surface-3 bg-surface-1">
            <p className="font-display text-xl text-text-primary">Voting abgeschlossen</p>
            {stats && <p className="text-text-muted text-sm mt-1">{stats.totalVotes} Personen haben abgestimmt.</p>}
          </div>
        )}

        {/* Photo Grid */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-1 space-y-1">
          {assets.map((asset) => {
            const rank = getRankForAsset(asset.id)
            const assetStats = getStatsForAsset(asset.id)
            const isPickable = votingStatus.isOpen && !submitted
            const thumbUrl = `/api/proxy/thumbnail/${asset.id}?size=preview`

            return (
              <div
                key={asset.id}
                className={`relative break-inside-avoid group cursor-pointer ${
                  isPickable ? 'hover:ring-2 hover:ring-accent/50' : ''
                } ${rank ? 'ring-2 ' + (rank === 1 ? 'ring-yellow-400' : rank === 2 ? 'ring-gray-300' : 'ring-amber-600') : ''}`}
                onClick={() => isPickable ? handlePickPhoto(asset.id) : setLightbox(asset.id)}
              >
                <img
                  src={thumbUrl}
                  alt={asset.originalFileName}
                  className="w-full block"
                  loading="lazy"
                />

                {/* Rank badge */}
                {rank && (
                  <div className={`absolute top-2 left-2 w-8 h-8 flex items-center justify-center text-sm z-10
                    ${rank === 1 ? 'bg-yellow-400 text-black' : rank === 2 ? 'bg-gray-300 text-black' : 'bg-amber-600 text-white'}`}>
                    {['🥇','🥈','🥉'][rank-1]}
                  </div>
                )}

                {/* Stats overlay (when submitted or voting ended) */}
                {(submitted || votingStatus.hasEnded) && assetStats && (
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-3">
                    {assetStats.rank1_count > 0 && (
                      <div className="text-yellow-400 text-sm font-medium">🥇 {assetStats.rank1_count}×</div>
                    )}
                    {assetStats.rank2_count > 0 && (
                      <div className="text-gray-300 text-sm font-medium">🥈 {assetStats.rank2_count}×</div>
                    )}
                    {assetStats.rank3_count > 0 && (
                      <div className="text-amber-600 text-sm font-medium">🥉 {assetStats.rank3_count}×</div>
                    )}
                    <div className="text-white/60 text-xs mt-1">Score: {assetStats.score}</div>
                  </div>
                )}

                {/* Enlarge hint */}
                {!isPickable && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-xs bg-black/60 px-2 py-1 transition-opacity">
                      ⊕ Vergrössern
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Results Summary */}
        {stats && stats.stats.length > 0 && (submitted || votingStatus.hasEnded) && (
          <div className="mt-16">
            <h2 className="font-display text-3xl font-light mb-1">Ergebnisse</h2>
            <div className="w-8 h-px bg-accent mb-8" />
            <p className="text-text-muted text-sm mb-6">{stats.totalVotes} Stimmen insgesamt</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.stats.slice(0, 3).map((s, i) => (
                <div key={s.asset_id} className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{['🥇','🥈','🥉'][i]}</span>
                    <span className="font-display text-lg text-text-primary">Platz {i + 1}</span>
                  </div>
                  <img
                    src={`/api/proxy/thumbnail/${s.asset_id}?size=thumbnail`}
                    alt=""
                    className="w-full aspect-[4/3] object-cover mb-3"
                  />
                  <div className="text-sm text-text-secondary space-y-0.5">
                    {s.rank1_count > 0 && <div>🥇 {s.rank1_count}× auf Platz 1</div>}
                    {s.rank2_count > 0 && <div>🥈 {s.rank2_count}× auf Platz 2</div>}
                    {s.rank3_count > 0 && <div>🥉 {s.rank3_count}× auf Platz 3</div>}
                    <div className="text-text-muted pt-1">Gesamtscore: {s.score}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl z-10"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          <img
            src={`/api/proxy/thumbnail/${lightbox}?size=preview`}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
