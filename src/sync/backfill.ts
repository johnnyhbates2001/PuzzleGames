import {
  getAllDailyChallengeHistory,
  getNonogramProgress,
  getPatchesProgress,
  getProgress,
  getSudokuProgress,
  getWordleProgress,
  getZipProgress,
  type DifficultyProgress,
} from '../storage/db'
import { postScoreBackfill, type DailyScorePayload, type GameScorePayload } from '../api/scores'
import type { Difficulty } from '../engine/types'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

const PROGRESS_GETTERS: Record<string, (difficulty: Difficulty) => Promise<DifficultyProgress>> = {
  queens: getProgress,
  sudoku: getSudokuProgress,
  zip: getZipProgress,
  patches: getPatchesProgress,
  nonogram: getNonogramProgress,
  wordle: getWordleProgress,
}

/** One-time seed of the account's leaderboard tables (game_stats, daily_scores) from
 *  this device's existing local history — call only when a device first links to a
 *  brand-new account (see useBackupSync.tsx's "no cloud backup yet" branch), so a
 *  returning player's friends-leaderboard stats reflect real past performance
 *  instead of starting at zero. Safe to call more than once if it ever needed to
 *  be: the backend only ever raises game_stats and never overwrites an existing
 *  daily_scores row (see worker/routes/scores.ts's handlePostScoreBackfill). */
export async function backfillLeaderboardStats(): Promise<void> {
  const gameStatsResults = await Promise.all(
    Object.entries(PROGRESS_GETTERS).flatMap(([gameId, getter]) =>
      DIFFICULTIES.map(async (difficulty): Promise<GameScorePayload | null> => {
        const progress = await getter(difficulty)
        if (progress.completedCount <= 0) return null
        return { gameId, difficulty, completedCount: progress.completedCount, bestTimeMs: progress.bestTimeMs, totalTimeMs: progress.totalTimeMs }
      }),
    ),
  )
  const gameStats = gameStatsResults.filter((entry): entry is GameScorePayload => entry !== null)

  const history = await getAllDailyChallengeHistory()
  const dailyScores: DailyScorePayload[] = history
    .filter((entry) => entry.gameId !== 'wordle' || entry.record.guessCount != null)
    .map((entry) => ({
      gameId: entry.gameId,
      dateKey: entry.dateKey,
      elapsedMs: entry.gameId === 'wordle' ? undefined : entry.record.elapsedMs,
      guesses: entry.gameId === 'wordle' ? entry.record.guessCount : undefined,
      assisted: entry.record.assisted,
    }))

  if (gameStats.length === 0 && dailyScores.length === 0) return
  await postScoreBackfill({ gameStats, dailyScores })
}
