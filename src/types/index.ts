export interface Album {
  id: number
  immich_id: string
  title: string
  description: string | null
  asset_count: number
  cover_asset_id: string | null
  is_visible: number
  voting_enabled: number
  voting_start: string | null
  voting_end: string | null
  lottery_enabled: number
  lottery_drawn: number
  lottery_winner_id: string | null
  created_at: string
  updated_at: string
}

export interface Vote {
  id: number
  album_id: number
  session_token: string
  rank1_asset_id: string
  rank2_asset_id: string | null
  rank3_asset_id: string | null
  email: string | null
  name: string | null
  created_at: string
}

export interface VoteStats {
  asset_id: string
  rank1_count: number
  rank2_count: number
  rank3_count: number
  score: number // rank1*3 + rank2*2 + rank3*1
  total_score?: number
}

export interface LotteryParticipant {
  id: number
  album_id: number
  vote_id: number
  email: string
  name: string | null
  is_winner: number
  notified: number
  created_at: string
}

export interface VotingStatus {
  isOpen: boolean
  hasStarted: boolean
  hasEnded: boolean
  startDate: Date | null
  endDate: Date | null
}

export function getVotingStatus(album: Album): VotingStatus {
  if (!album.voting_enabled) {
    return { isOpen: false, hasStarted: false, hasEnded: false, startDate: null, endDate: null }
  }
  const now = new Date()
  const start = album.voting_start ? new Date(album.voting_start) : null
  const end = album.voting_end ? new Date(album.voting_end) : null
  const hasStarted = !start || now >= start
  const hasEnded = !!end && now > end
  return {
    isOpen: hasStarted && !hasEnded,
    hasStarted,
    hasEnded,
    startDate: start,
    endDate: end,
  }
}
