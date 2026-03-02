'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Album, getVotingStatus, VoteStats } from '@/types'
import type { ImmichAsset } from '@/lib/immich'
import { useLang, LangToggle } from '@/lib/LanguageContext'

type PickSlot = 1 | 2 | 3

interface AlbumWithStatus extends Album {
  votingStatus?: ReturnType<typeof getVotingStatus>
}

const RANK_COLORS = {
  1: { ring: 'ring-yellow-400', badge: 'bg-yellow-400 text-black', btn: 'bg-yellow-400 text-black hover:bg-yellow-300', label: '🥇' },
  2: { ring: 'ring-gray-300', badge: 'bg-gray-300 text-black', btn: 'bg-gray-300 text-black hover:bg-gray-200', label: '🥈' },
  3: { ring: 'ring-amber-600', badge: 'bg-amber-600 text-white', btn: 'bg-amber-600 text-white hover:bg-amber-500', label: '🥉' },
}

export default function AlbumPage() {
  const params = useParams()
  const albumId = params.id as string
  const { t } = useLang()

  const [album, setAlbum] = useState<AlbumWithStatus | null>(null)
  const [assets, setAssets] = useState<ImmichAsset[]>([])
  const [picks, setPicks] = useState<Record<PickSlot, string | null>>({ 1: null, 2: null, 3: null })
  const [stats, setStats] = useState<{ totalVotes: number; stats: VoteStats[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showLotteryForm, setShowLotteryForm] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/albums`).then(r => r.json()),
      fetch(`/api/albums/${albumId}/assets`).then(r => r.json()),
      fetch(`/api/albums/${albumId}/votes`).then(r => r.json()),
      fetch(`/api/albums/${albumId}/stats`).then(r => r.json()),
    ]).then(([albums, assets, voteStatus, statsData]) => {
      const found = (albums as Album[]).find(a => a.id === parseInt(albumId))
      if (found) setAlbum({ ...found, votingStatus: getVotingStatus(found) })
      if (Array.isArray(assets)) setAssets(assets)
      if (voteStatus.voted && voteStatus.vote) {
        setPicks({ 1: voteStatus.vote.rank1_asset_id, 2: voteStatus.vote.rank2_asset_id, 3: voteStatus.vote.rank3_asset_id })
        setSubmitted(true)
      }
      if (statsData.stats) setStats(statsData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [albumId])

  const getRankForAsset = (assetId: string): PickSlot | null => {
    for (const rank of [1, 2, 3] as PickSlot[]) {
      if (picks[rank] === assetId) return rank
    }
    return null
  }

  const handleRankClick = useCallback((assetId: string, rank: PickSlot, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!album?.votingStatus?.isOpen || submitted) return
    setPicks(prev => {
      const newPicks = { ...prev }
      if (prev[rank] === assetId) { newPicks[rank] = null; return newPicks }
      for (const r of [1, 2, 3] as PickSlot[]) { if (prev[r] === assetId) newPicks[r] = null }
      newPicks[rank] = assetId
      return newPicks
    })
  }, [album, submitted])

  const handleSubmit = async () => {
    if (!picks[1]) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/albums/${albumId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rank1: picks[1], rank2: picks[2] || undefined, rank3: picks[3] || undefined, email: email || undefined, name: name || undefined }),
      })
      if (res.ok) {
        setSubmitted(true)
        setShowLotteryForm(false)
        const statsData = await fetch(`/api/albums/${albumId}/stats`).then(r => r.json())
        if (statsData.stats) setStats(statsData)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getStatsForAsset = (assetId: string) => stats?.stats.find(s => s.asset_id === assetId)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-text-muted font-display text-2xl animate-pulse">{t.loading}</div></div>
  if (!album) return <div className="min-h-screen flex items-center justify-center"><div className="text-text-muted">{t.albumNotFound}</div></div>

  const votingStatus = album.votingStatus!
  const isPickable = votingStatus.isOpen && !submitted
  const picksCount = [picks[1], picks[2], picks[3]].filter(Boolean).length

  return (
    <div className="grain min-h-screen">
      <header className="border-b border-surface-3 px-8 py-5 flex items-center gap-6">
        <Link href="/" className="text-text-muted hover:text-accent transition-colors text-sm">{t.back}</Link>
        <div className="h-4 w-px bg-surface-3" />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-light text-text-primary">{album.title}</h1>
          {album.description && <p className="text-text-muted text-xs mt-0.5">{album.description}</p>}
        </div>
        <LangToggle />
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {votingStatus.isOpen && !submitted && (
          <div className="mb-8 p-5 border border-accent/30 bg-accent/5">
            <p className="font-display text-xl text-accent mb-1">{t.chooseTop3}</p>
            <p className="text-text-secondary text-sm mb-4">
              {t.clickToPlace}
              {votingStatus.endDate && (
                <span className="ml-2 text-text-muted">
                  {t.votingEnds} {new Date(votingStatus.endDate).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              )}
            </p>
            <div className="flex gap-3 flex-wrap">
              {([1, 2, 3] as PickSlot[]).map(rank => (
                <div key={rank} className={`flex items-center gap-2 px-3 py-1.5 border text-sm ${picks[rank] ? 'border-accent/50 bg-accent/5' : 'border-surface-3 opacity-40'}`}>
                  <span>{RANK_COLORS[rank].label}</span>
                  <span className={picks[rank] ? 'text-text-secondary' : 'text-text-muted'}>{picks[rank] ? t.chosen : t.empty}</span>
                </div>
              ))}
            </div>
            {picksCount > 0 && (
              <div className="mt-4 pt-4 border-t border-surface-3">
                {!showLotteryForm ? (
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="text-sm text-text-secondary">
                      {picksCount === 3 ? t.allChosen : t.xOf3(picksCount)}
                    </div>
                    {album.lottery_enabled ? (
                      <button onClick={() => setShowLotteryForm(true)} className="btn-primary text-sm py-2">{t.continueAndLottery}</button>
                    ) : (
                      <button onClick={handleSubmit} disabled={!picks[1] || submitting} className="btn-primary text-sm py-2 disabled:opacity-40">
                        {submitting ? t.saving : t.vote}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-surface-2 p-5 border border-surface-3 max-w-md">
                    <p className="font-display text-lg text-accent mb-1">{t.joinLottery}</p>
                    <p className="text-text-secondary text-sm mb-4">{t.lotteryDesc}</p>
                    <input type="text" placeholder={t.namePlaceholder} value={name} onChange={e => setName(e.target.value)}
                      className="w-full bg-surface-1 border border-surface-3 px-4 py-2.5 text-sm text-text-primary placeholder-text-muted mb-3 focus:outline-none focus:border-accent" />
                    <input type="email" placeholder={t.emailPlaceholder} value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full bg-surface-1 border border-surface-3 px-4 py-2.5 text-sm text-text-primary placeholder-text-muted mb-4 focus:outline-none focus:border-accent" />
                    <div className="flex gap-3">
                      <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-sm py-2 flex-1">
                        {submitting ? t.saving : email ? t.voteAndJoin : t.onlyVote}
                      </button>
                      <button onClick={() => setShowLotteryForm(false)} className="btn-secondary text-sm py-2">{t.back2}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {submitted && (
          <div className="mb-8 p-5 border border-green-800/40 bg-green-900/10">
            <p className="font-display text-xl text-green-400">{t.thankYou}</p>
            <p className="text-text-secondary text-sm mt-1">{t.thankYouDesc}</p>
          </div>
        )}

        {votingStatus.hasEnded && (
          <div className="mb-8 p-5 border border-surface-3 bg-surface-1">
            <p className="font-display text-xl text-text-primary">{t.votingClosed}</p>
            {stats && <p className="text-text-muted text-sm mt-1">{t.peopleVoted(stats.totalVotes)}</p>}
          </div>
        )}

        <div className="columns-2 md:columns-3 lg:columns-4 gap-1 space-y-1">
          {assets.map((asset) => {
            const rank = getRankForAsset(asset.id)
            const assetStats = getStatsForAsset(asset.id)
            const thumbUrl = `/api/proxy/thumbnail/${asset.id}?size=preview`
            return (
              <div key={asset.id} className={`relative break-inside-avoid group ${rank ? 'ring-2 ' + RANK_COLORS[rank as PickSlot].ring : ''}`}>
                <img src={thumbUrl} alt={asset.originalFileName} className="w-full block cursor-zoom-in" loading="lazy" onClick={() => setLightbox(asset.id)} />
                {rank && (
                  <div className={`absolute top-2 left-2 w-8 h-8 flex items-center justify-center text-sm z-10 ${RANK_COLORS[rank as PickSlot].badge}`}>
                    {RANK_COLORS[rank as PickSlot].label}
                  </div>
                )}
                {isPickable && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 p-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {([1, 2, 3] as PickSlot[]).map(r => {
                      const isActive = picks[r] === asset.id
                      const isTaken = picks[r] !== null && picks[r] !== asset.id
                      return (
                        <button key={r} onClick={(e) => handleRankClick(asset.id, r, e)}
                          className={`px-2 py-1 text-xs font-bold transition-all ${isActive ? RANK_COLORS[r].btn + ' ring-1 ring-white' : isTaken ? 'bg-white/10 text-white/30 cursor-not-allowed' : RANK_COLORS[r].btn}`}>
                          {RANK_COLORS[r].label}
                        </button>
                      )
                    })}
                  </div>
                )}
                {(submitted || votingStatus.hasEnded) && assetStats && (
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-3 pointer-events-none">
                    {assetStats.rank1_count > 0 && <div className="text-yellow-400 text-sm font-medium">🥇 {assetStats.rank1_count}×</div>}
                    {assetStats.rank2_count > 0 && <div className="text-gray-300 text-sm font-medium">🥈 {assetStats.rank2_count}×</div>}
                    {assetStats.rank3_count > 0 && <div className="text-amber-600 text-sm font-medium">🥉 {assetStats.rank3_count}×</div>}
                    <div className="text-white/60 text-xs mt-1">Score: {assetStats.score}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {stats && stats.stats.length > 0 && (submitted || votingStatus.hasEnded) && (
          <div className="mt-16">
            <h2 className="font-display text-3xl font-light mb-1">{t.results}</h2>
            <div className="w-8 h-px bg-accent mb-8" />
            <p className="text-text-muted text-sm mb-6">{t.totalVotes(stats.totalVotes)}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.stats.slice(0, 3).map((s, i) => (
                <div key={s.asset_id} className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{['🥇','🥈','🥉'][i]}</span>
                    <span className="font-display text-lg text-text-primary">{t.place(i + 1)}</span>
                  </div>
                  <img src={`/api/proxy/thumbnail/${s.asset_id}?size=thumbnail`} alt="" className="w-full aspect-[4/3] object-cover mb-3 cursor-zoom-in" onClick={() => setLightbox(s.asset_id)} />
                  <div className="text-sm text-text-secondary space-y-0.5">
                    {s.rank1_count > 0 && <div>🥇 {s.rank1_count}{t.onPlace(1)}</div>}
                    {s.rank2_count > 0 && <div>🥈 {s.rank2_count}{t.onPlace(2)}</div>}
                    {s.rank3_count > 0 && <div>🥉 {s.rank3_count}{t.onPlace(3)}</div>}
                    <div className="text-text-muted pt-1">{t.totalScore}: {s.score}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl z-10" onClick={() => setLightbox(null)}>✕</button>
          <img src={`/api/proxy/thumbnail/${lightbox}?size=preview`} alt="" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
