import {
  getAllDailyChallengeHistory,
  getNonogramProgress,
  getPatchesProgress,
  getProgress,
  getSudokuProgress,
  getWordleProgress,
  getKillerProgress,
  getTangoProgress,
  getZipProgress,
  type DifficultyProgress,
} from '../storage/db'
import { postScoreBackfill, type DailyScorePayload, type GameScorePayload } from '../api/scores'
import type { Difficulty } from '../engine/types'
import { todayDateKey } from '../games/dailyChallenge'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

const PROGRESS_GETTERS: Record<string, (difficulty: Difficulty) => Promise<DifficultyProgress>> = {
  queens: getProgress,
  sudoku: getSudokuProgress,
  zip: getZipProgress,
  patches: getPatchesProgress,
  nonogram: getNonogramProgress,
  wordle: getWordleProgress,
  killer: getKillerProgress,
  tango: getTangoProgress,
}

// Mirrors worker/routes/scores.ts's MAX_BACKFILL_DAILY_SCORES — the most daily
// scores one request may carry; longer histories go over several requests.
const DAILY_SCORES_PER_REQUEST = 400

/** How far back the routine resync (syncRecentDailyScores) looks — wide enough to
 *  repair yesterday's missed score, or a few days played offline/signed out. */
const RECENT_SYNC_DAYS = 7

async function dailyScorePayloads(sinceDateKey?: string): Promise<DailyScorePayload[]> {
  const history = await getAllDailyChallengeHistory(sinceDateKey)
  return history
    .filter((entry) => entry.record.won !== false)
    .filter((entry) => entry.gameId !== 'wordle' || entry.record.guessCount != null)
    .map((entry) => ({
      gameId: entry.gameId,
      dateKey: entry.dateKey,
      elapsedMs: entry.gameId === 'wordle' ? undefined : entry.record.elapsedMs,
      guesses: entry.gameId === 'wordle' ? entry.record.guessCount : undefined,
      assisted: entry.record.assisted,
    }))
}

/** Full seed of the account's leaderboard tables (game_stats, daily_scores) from
 *  this device's local history — run when a device first links to an account (see
 *  useBackupSync.tsx) and from Settings' "Resync", so a returning player's
 *  friends-leaderboard stats reflect real past performance instead of starting at
 *  zero. Safe to call any number of times: the backend only ever raises game_stats
 *  and never overwrites an existing daily_scores row (see worker/routes/scores.ts's
 *  handlePostScoreBackfill). */
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
  const dailyScores = await dailyScorePayloads()

  if (gameStats.length === 0 && dailyScores.length === 0) return
  // gameStats ride along with the first request only; sequential so a failure stops
  // the run (and surfaces to the caller) instead of leaving gaps in the middle.
  await postScoreBackfill({ gameStats, dailyScores: dailyScores.slice(0, DAILY_SCORES_PER_REQUEST) })
  for (let i = DAILY_SCORES_PER_REQUEST; i < dailyScores.length; i += DAILY_SCORES_PER_REQUEST) {
    await postScoreBackfill({ gameStats: [], dailyScores: dailyScores.slice(i, i + DAILY_SCORES_PER_REQUEST) })
  }
}

/** Re-sends just the last week of this device's daily results — cheap enough to run
 *  on every launch, return to the app, reconnect, and Friends-page visit (see
 *  useBackupSync.tsx). This is what makes the daily leaderboard self-healing: the
 *  live post after a win (useGameCompletion.ts) can be lost to a flaky connection,
 *  the app being closed straight after winning, or being signed out at the time,
 *  and this fills the gap on the next pass. Existing server rows are never
 *  overwritten, so re-sending is harmless. */
export async function syncRecentDailyScores(): Promise<void> {
  const since = todayDateKey(Date.now() - (RECENT_SYNC_DAYS - 1) * 24 * 60 * 60 * 1000)
  const dailyScores = await dailyScorePayloads(since)
  if (dailyScores.length === 0) return
  await postScoreBackfill({ gameStats: [], dailyScores })
}
