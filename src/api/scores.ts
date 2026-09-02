import { apiGet, apiPost } from './client'

export interface DailyScorePayload {
  gameId: string
  dateKey: string
  elapsedMs?: number
  guesses?: number
  assisted: boolean
}

export function postDailyScore(payload: DailyScorePayload): Promise<{ ok: boolean }> {
  return apiPost('/scores/daily', payload)
}

export interface DailyLeaderboardEntry {
  userId: string
  username: string
  avatarType: string
  avatarValue: string
  elapsedMs: number | null
  guesses: number | null
  assisted: boolean
}

export function fetchDailyLeaderboard(gameId: string, dateKey: string): Promise<{ entries: DailyLeaderboardEntry[] }> {
  return apiGet(`/leaderboard/daily/${gameId}/${dateKey}`)
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
