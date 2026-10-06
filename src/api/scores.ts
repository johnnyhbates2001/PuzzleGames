import { apiGet, apiPost } from './client'

export interface DailyScorePayload {
  gameId: string
  dateKey: string
  elapsedMs?: number
  guesses?: number
  assisted: boolean
}

export function postDailyScore(payload: DailyScorePayload): Promise<{ ok: boolean }> {
  // keepalive: players often close the app straight after winning, which would
  // otherwise cancel this request before it reaches the server.
  return apiPost('/scores/daily', payload, { keepalive: true })
}

export interface DailyBoardPlayer {
  userId: string
  username: string
  avatarType: string
  avatarValue: string
  isMe: boolean
}

export interface DailyBoardScore {
  userId: string
  gameId: string
  elapsedMs: number | null
  guesses: number | null
  assisted: boolean
}

export interface DailyBoard {
  players: DailyBoardPlayer[]
  scores: DailyBoardScore[]
}

/** Every game's daily scores for `dateKey`, for the caller and all their friends. */
export function fetchDailyBoard(dateKey: string): Promise<DailyBoard> {
  return apiGet(`/leaderboard/daily/${dateKey}`)
}

export interface GameScorePayload {
  gameId: string
  difficulty: string
  completedCount: number
  bestTimeMs: number | null
  totalTimeMs: number
}

export function postGameScore(payload: GameScorePayload): Promise<{ ok: boolean }> {
  return apiPost('/scores/game', payload)
}

export interface GameLeaderboardEntry {
  userId: string
  username: string
  avatarType: string
  avatarValue: string
  completedCount: number
  bestTimeMs: number | null
  averageTimeMs: number | null
}

export function fetchGameLeaderboard(gameId: string): Promise<{ entries: GameLeaderboardEntry[] }> {
  return apiGet(`/leaderboard/game/${gameId}`)
}

export interface BackfillPayload {
  gameStats: GameScorePayload[]
  dailyScores: DailyScorePayload[]
}

export function postScoreBackfill(payload: BackfillPayload): Promise<{ ok: boolean; applied: number }> {
  return apiPost('/scores/backfill', payload)
}
