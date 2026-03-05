'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Album, getVotingStatus, VoteStats } from '@/types'
import type { ImmichAsset } from '@/lib/immich'
import { useLang, LangToggle } from '@/lib/LanguageContext'
import { Logo } from '@/components/Logo'

type PickSlot = 1 | 2 | 3
type SortKey = 'dateDesc' | 'dateAsc' | 'name' | 'random' | 'score'
type Tab = 'photos' | 'results'

interface AlbumWithStatus extends Album {
  votingStatus?: ReturnType<typeof getVotingStatus>
}

const RANK_COLORS = {
  1: { ring: 'ring-yellow-400', badge: 'bg-yellow-400 text-black', btn: 'bg-yellow-400 text-black hover:bg-yellow-300', label: '🥇' },
  2: { ring: 'ring-gray-300', badge: 'bg-gray-300 text-black', btn: 'bg-gray-300 text-black hover:bg-gray-200', label: '🥈' },
  3: { ring: 'ring-amber-600', badge: 'bg-amber-600 text-white', btn: 'bg-amber-600 text-white hover:bg-amber-500', label: '🥉' },
}

const GRID_WIDTH = 1200 // px, matches max-w-7xl approx
const GAP = 4 // px gap between cells

// A row contains 2 or 3 assets.
// The "lead" asset determines the row height based on its aspect ratio and assigned width.
// All assets in a row share the same height.
interface RowCell { asset: ImmichAsset; flex: number }
interface Row { cells: RowCell[]; height: number }

function getAspect(asset: ImmichAsset): number {
  const w = asset.exifInfo?.exifImageWidth || asset.width
  const h = asset.exifInfo?.exifImageHeight || asset.height
  if (w && h) return w / h
  return 4 / 3 // fallback
}

function buildRows(assets: ImmichAsset[]): Row[] {
  const rows: Row[] = []
  let i = 0

  while (i < assets.length) {
    const remaining = assets.length - i
    const r = Math.random()

    // Decide row pattern
    let pattern: ('wide' | 'normal')[]

    if (remaining === 1) {
      pattern = ['wide'] // last single image gets 2/3 width
    } else if (remaining === 2) {
      pattern = ['normal', 'normal']
    } else {
      // 3 or more remaining
      if (r < 0.15) pattern = ['wide', 'normal']       // 2/3 + 1/3
      else if (r < 0.30) pattern = ['normal', 'wide']  // 1/3 + 2/3
      else pattern = ['normal', 'normal', 'normal']     // 3 equal
    }

    const cells: RowCell[] = pattern.map((p, idx) => ({
      asset: assets[i + idx],
      flex: p === 'wide' ? 2 : 1,
    }))

    // Lead cell is the widest one; use its aspect ratio to compute row height
    const leadCell = cells.reduce((a, b) => a.flex >= b.flex ? a : b)
    const leadAspect = getAspect(leadCell.asset)
    const totalFlex = cells.reduce((sum, c) => sum + c.flex, 0)
    const gapTotal = (cells.length - 1) * GAP
    const leadWidth = (GRID_WIDTH - gapTotal) * (leadCell.flex / totalFlex)
    const rowHeight = Math.round(leadWidth / leadAspect)

    // Clamp height between 200 and 500px
    const clampedHeight = Math.min(500, Math.max(200, rowHeight))

    rows.push({ cells, height: clampedHeight })
    i += pattern.length
  }

  return rows
}

function sortAssets(assets: ImmichAsset[], sort: SortKey, stats: { stats: VoteStats[] } | null): ImmichAsset[] {
  const arr = [...assets]
  switch (sort) {
    case 'dateDesc': return arr.sort((a, b) => new Date(b.fileCreatedAt || 0).getTime() - new Date(a.fileCreatedAt || 0).getTime())
    case 'dateAsc': return arr.sort((a, b) => new Date(a.fileCreatedAt || 0).getTime() - new Date(b.fileCreatedAt || 0).getTime())
    case 'name': return arr.sort((a, b) => a.originalFileName.localeCompare(b.originalFileName))
    case 'random': return arr.sort(() => Math.random() - 0.5)
    case 'score': {
      const scoreMap = new Map(stats?.stats.map(s => [s.asset_id, s.score]) || [])
      return arr.sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0))
    }
    default: return arr
  }
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
  const [sortKey, setSortKey] = useState<SortKey>('dateDesc')
  const [activeTab, setActiveTab] = useState<Tab>('photos')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [windowWidth, setWindowWidth] = useState(1200)

  useEffect(() => {
    const update = () => setWindowWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    Promise.all([
      fetch(`/api/albums`).then(r => r.json()),
      fetch(`/api/albums/${albumId}/assets`).then(r => r.json()),
      fetch(`/api/albums/${albumId}/votes`).then(r => r.json()),
      fetch(`/api/albums/${albumId}/stats`).then(r => r.json()),
    ]).then(([albums, assetsData, voteStatus, statsData]) => {
      const found = (albums as Album[]).find(a => a.id === parseInt(albumId))
      if (found) setAlbum({ ...found, votingStatus: getVotingStatus(found) })
      if (Array.isArray(assetsData)) {
        setAssets(assetsData)
        setRows(buildRows(assetsData))
      }
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
        setActiveTab('results')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getStatsForAsset = (assetId: string) => stats?.stats.find(s => s.asset_id === assetId)

  const showResultsTab = submitted || (album?.votingStatus?.hasEnded ?? false)
  const sortedAssets = sortAssets(assets, sortKey, stats)

  // Rebuild rows when sort changes, keeping same random seed per asset order
  const [sortedRows, setSortedRows] = useState<Row[]>([])
  useEffect(() => {
    if (sortedAssets.length > 0) setSortedRows(buildRows(sortedAssets))
  }, [sortKey, assets])

  const availableSorts: { key: SortKey; label: string }[] = [
    { key: 'dateDesc', label: t.sortDateDesc },
    { key: 'dateAsc', label: t.sortDateAsc },
    { key: 'name', label: t.sortName },
    { key: 'random', label: t.sortRandom },
    ...(showResultsTab ? [{ key: 'score' as SortKey, label: t.sortScore }] : []),
  ]

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-text-muted font-display text-2xl animate-pulse">{t.loading}</div></div>
  if (!album) return <div className="min-h-screen flex items-center justify-center"><div className="text-text-muted">{t.albumNotFound}</div></div>

  const votingStatus = album.votingStatus!
  const isPickable = votingStatus.isOpen && !submitted
  const picksCount = [picks[1], picks[2], picks[3]].filter(Boolean).length
  const displayRows = sortedRows.length > 0 ? sortedRows : rows

  return (
    <div className="grain min-h-screen">
      <header className="border-b border-surface-3 px-4 sm:px-8 py-4 flex items-center gap-4 sm:gap-6">
        <Link href="/" className="text-text-muted hover:text-accent transition-colors text-sm shrink-0">{t.back}</Link>
        <div className="h-4 w-px bg-surface-3 shrink-0" />
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Logo size="small" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-light text-text-primary truncate">{album.title}</h1>
          {album.description && <p className="text-text-muted text-xs mt-0.5 truncate">{album.description}</p>}
        </div>
        <LangToggle />
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-8">

        {votingStatus.isOpen && !submitted && (
          <div className="mb-6 p-5 border border-accent/30 bg-accent/5">
            <p className="font-display text-xl text-accent mb-1">{t.chooseTop3}</p>
            <p className="text-text-secondary text-sm mb-4">
              {t.clickToPlace}
              {votingStatus.endDate && (
                <span className="ml-2 text-text-muted">
                  {t.votingEnds} {new Date(votingStatus.endDate).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              )}
            </p>
            <div className="flex gap-3 flex-wrap mb-4">
              {([1, 2, 3] as PickSlot[]).map(rank => (
                <div key={rank} className={`flex items-center gap-2 px-3 py-1.5 border text-sm ${picks[rank] ? 'border-accent/50 bg-accent/5' : 'border-surface-3 opacity-40'}`}>
                  <span>{RANK_COLORS[rank].label}</span>
                  <span className={picks[rank] ? 'text-text-secondary' : 'text-text-muted'}>{picks[rank] ? t.chosen : t.empty}</span>
                </div>
              ))}
            </div>
            {picksCount > 0 && (
              <div className="pt-4 border-t border-surface-3">
                {!showLotteryForm ? (
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="text-sm text-text-secondary">{picksCount === 3 ? t.allChosen : t.xOf3(picksCount)}</div>
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
          <div className="mb-6 p-4 border border-green-800/40 bg-green-900/10">
            <p className="font-display text-lg text-green-400">{t.thankYou}</p>
            <p className="text-text-secondary text-sm mt-0.5">{t.thankYouDesc}</p>
          </div>
        )}

        {votingStatus.hasEnded && !submitted && (
          <div className="mb-6 p-4 border border-surface-3 bg-surface-1">
            <p className="font-display text-lg text-text-primary">{t.votingClosed}</p>
            {stats && <p className="text-text-muted text-sm mt-0.5">{t.peopleVoted(stats.totalVotes)}</p>}
          </div>
        )}

        {/* Tabs + Sort */}
        <div className="flex items-center justify-between mb-6 border-b border-surface-3">
          <div className="flex">
            <button onClick={() => setActiveTab('photos')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'photos' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
              {t.tabPhotos} ({assets.length})
            </button>
            {showResultsTab && (
              <button onClick={() => setActiveTab('results')}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'results' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
                {t.tabResults} {stats ? `(${stats.totalVotes})` : ''}
              </button>
            )}
          </div>
          {activeTab === 'photos' && (
            <div className="flex items-center gap-2 pb-2">
              <span className="text-text-muted text-xs">{t.sortBy}:</span>
              <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                className="bg-surface-2 border border-surface-3 text-text-secondary text-xs px-2 py-1 focus:outline-none focus:border-accent">
                {availableSorts.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="flex flex-col" style={{ gap: `${GAP}px`, touchAction: 'pan-y pinch-zoom' }}>
            {displayRows.map((row, ri) => {
              const scale = Math.min(1, (windowWidth - 64) / GRID_WIDTH)
              const rowH = Math.max(100, Math.round(row.height * scale))
              return (
              <div key={ri} className="flex" style={{ height: `${rowH}px`, gap: `${GAP}px` }}>
                {row.cells.map(({ asset, flex }) => {
                  const rank = getRankForAsset(asset.id)
                  const assetStats = getStatsForAsset(asset.id)
                  return (
                    <div
                      key={asset.id}
                      className={`relative group overflow-hidden ${rank ? 'ring-2 ' + RANK_COLORS[rank as PickSlot].ring : ''}`}
                      style={{ flex }}
                    >
                      <img
                        src={`/api/proxy/thumbnail/${asset.id}?size=preview`}
                        alt={asset.originalFileName}
                        className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onClick={() => setLightbox(asset.id)}
                      />
                      {rank && (
                        <div className={`absolute top-2 left-2 w-7 h-7 flex items-center justify-center text-xs z-10 ${RANK_COLORS[rank as PickSlot].badge}`}>
                          {RANK_COLORS[rank as PickSlot].label}
                        </div>
                      )}
                      {isPickable && (
                        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 p-1.5 bg-black/60 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
                          {([1, 2, 3] as PickSlot[]).map(r => {
                            const isActive = picks[r] === asset.id
                            const isTaken = picks[r] !== null && picks[r] !== asset.id
                            return (
                              <button key={r} onClick={e => handleRankClick(asset.id, r, e)}
                                className={`px-2 py-1 text-xs font-bold transition-all ${isActive ? RANK_COLORS[r].btn + ' ring-1 ring-white' : isTaken ? 'bg-white/10 text-white/30 cursor-not-allowed' : RANK_COLORS[r].btn}`}>
                                {RANK_COLORS[r].label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {(submitted || votingStatus.hasEnded) && assetStats && (
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-3 pointer-events-none">
                          {assetStats.rank1_count > 0 && <div className="text-yellow-400 text-sm font-medium">🥇 {assetStats.rank1_count}x</div>}
                          {assetStats.rank2_count > 0 && <div className="text-gray-300 text-sm font-medium">🥈 {assetStats.rank2_count}x</div>}
                          {assetStats.rank3_count > 0 && <div className="text-amber-600 text-sm font-medium">🥉 {assetStats.rank3_count}x</div>}
                          <div className="text-white/60 text-xs mt-1">Score: {assetStats.score}</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )})}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && showResultsTab && (
          <div>
            {!stats || stats.stats.length === 0 ? (
              <p className="text-text-muted text-center py-16">{t.noResults}</p>
            ) : (
              <>
                <p className="text-text-muted text-sm mb-8">{t.totalVotes(stats.totalVotes)}</p>

                {/* Top 3 – hero layout, full width each */}
                <div className="flex flex-col gap-1 mb-10">
                  {stats.stats.slice(0, 3).map((s, i) => (
                    <div key={s.asset_id} className="flex gap-0" style={{ height: '420px' }}>
                      {/* Image */}
                      <div className="relative group flex-1 overflow-hidden cursor-zoom-in" onClick={() => setLightbox(s.asset_id)}>
                        <img
                          src={`/api/proxy/thumbnail/${s.asset_id}?size=preview`}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-3 left-3 text-3xl">{['🥇','🥈','🥉'][i]}</div>
                      </div>
                      {/* Stats sidebar */}
                      <div className="w-48 flex-shrink-0 bg-surface-1 border-l border-surface-3 flex flex-col justify-center px-5 py-6 gap-3">
                        <div>
                          <p className="font-display text-2xl text-accent">{t.place(i + 1)}</p>
                          <p className="text-text-muted text-xs mt-0.5">Score: {s.score}</p>
                        </div>
                        <div className="border-t border-surface-3 pt-3 space-y-2 text-sm">
                          {s.rank1_count > 0 && (
                            <div className="flex items-center justify-between">
                              <span>🥇 Platz 1</span>
                              <span className="text-text-secondary font-medium">{s.rank1_count}×</span>
                            </div>
                          )}
                          {s.rank2_count > 0 && (
                            <div className="flex items-center justify-between">
                              <span>🥈 Platz 2</span>
                              <span className="text-text-secondary font-medium">{s.rank2_count}×</span>
                            </div>
                          )}
                          {s.rank3_count > 0 && (
                            <div className="flex items-center justify-between">
                              <span>🥉 Platz 3</span>
                              <span className="text-text-secondary font-medium">{s.rank3_count}×</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t border-surface-3 pt-2 text-text-muted text-xs">
                            <span>Total Votes</span>
                            <span>{s.rank1_count + s.rank2_count + s.rank3_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Platz 4+ – 3-Spalten Grid */}
                {stats.stats.length > 3 && (
                  <>
                    <h3 className="font-display text-xl font-light mb-4 text-text-secondary">Weitere bewertete Fotos</h3>
                    <div className="flex flex-col gap-1">
                      {(() => {
                        const rest = stats.stats.slice(3)
                        const restRows: { asset: VoteStats; flex: number }[][] = []
                        for (let ri = 0; ri < rest.length; ri += 3) {
                          restRows.push(rest.slice(ri, ri + 3).map(s => ({ asset: s, flex: 1 })))
                        }
                        return restRows.map((row, ri) => (
                          <div key={ri} className="flex gap-1" style={{ height: '280px' }}>
                            {row.map(({ asset: s }, ci) => {
                              const rank = stats.stats.findIndex(x => x.asset_id === s.asset_id) + 1
                              return (
                                <div key={s.asset_id} className="relative group flex-1 overflow-hidden cursor-zoom-in" onClick={() => setLightbox(s.asset_id)}>
                                  <img
                                    src={`/api/proxy/thumbnail/${s.asset_id}?size=preview`}
                                    alt=""
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                  {/* Rank badge */}
                                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5">
                                    #{rank}
                                  </div>
                                  {/* Hover stats */}
                                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-3 pointer-events-none">
                                    {s.rank1_count > 0 && <div className="text-yellow-400 text-sm">🥇 {s.rank1_count}×</div>}
                                    {s.rank2_count > 0 && <div className="text-gray-300 text-sm">🥈 {s.rank2_count}×</div>}
                                    {s.rank3_count > 0 && <div className="text-amber-600 text-sm">🥉 {s.rank3_count}×</div>}
                                    <div className="text-white/60 text-xs mt-1">Score: {s.score}</div>
                                  </div>
                                </div>
                              )
                            })}
                            {/* Fill empty cells in last row */}
                            {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, ei) => (
                              <div key={`empty-${ei}`} className="flex-1 bg-surface-1" />
                            ))}
                          </div>
                        ))
                      })()}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showBackToTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 bg-surface-2 border border-surface-3 text-text-muted hover:text-accent hover:border-accent transition-colors px-3 py-2 text-xs">
          {t.backToTop}
        </button>
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl z-10" onClick={() => setLightbox(null)}>✕</button>
          <img
            src={`/api/proxy/thumbnail/${lightbox}?size=preview`}
            alt=""
            className="max-w-full max-h-full object-contain cursor-zoom-out"
            onClick={() => setLightbox(null)}
          />
        </div>
      )}
    </div>
  )
}


