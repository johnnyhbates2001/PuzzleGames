import { withAuth, type AuthedContext } from '../lib/auth'
import type { Env } from '../types'
import { errorResponse, json, readJson } from '../lib/http'
import { getFriendIds } from '../lib/friends'
import { isDifficultyId, isGameId } from '../lib/games'

// "Light sanity checks" tier (see the plan) — not full server-side puzzle validation,
// just enough to reject obviously-impossible or forged submissions.
const MIN_ELAPSED_MS = 2000
const MAX_DATE_SKEW_MS = 2 * 24 * 60 * 60 * 1000 // generous — covers any timezone plus some buffer
// The Daily Challenge always uses 'medium' rules (see engine/wordle/types.ts's
// WORDLE_RULES.medium.attempts) and lets the player keep retrying the same word
// after a loss until they win it — so a synced score is always a winning guess
// count, 1-6, never a loss value.
const WORDLE_MAX_GUESSES = 6

function isValidDateKey(dateKey: unknown): dateKey is string {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false
  const parsed = Date.parse(`${dateKey}T00:00:00Z`)
  return !Number.isNaN(parsed) && Math.abs(Date.now() - parsed) <= MAX_DATE_SKEW_MS
}

// Backfill (see handlePostScoreBackfill) seeds real history that can be much older
// than a live submission ever would be — same format check as isValidDateKey, but
// without the "must be within a couple days of now" lower bound, just an upper one
// so nobody backdates a score into the future.
function isPlausibleHistoricalDateKey(dateKey: unknown): dateKey is string {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false
  const parsed = Date.parse(`${dateKey}T00:00:00Z`)
  return !Number.isNaN(parsed) && parsed <= Date.now() + MAX_DATE_SKEW_MS
}

/** Single self-contained upsert — the "only ever raise the stored value" merge (see
 *  the plan) is expressed directly in SQL via scalar max()/min() against the table's
 *  own current row, so no prior SELECT is needed. That also makes this safe to fire
 *  many of at once via env.DB.batch() (see handlePostScoreBackfill), since each
 *  statement is correct independent of statement order or of what's already stored. */
function gameStatUpsert(
  env: Env,
  userId: string,
  gameId: string,
  difficulty: string,
  completedCount: number,
  bestTimeMs: number | null,
  totalTimeMs: number,
): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO game_stats (user_id, game_id, difficulty, completed_count, best_time_ms, total_time_ms, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, game_id, difficulty) DO UPDATE SET
       completed_count = max(game_stats.completed_count, excluded.completed_count),
       best_time_ms = CASE
         WHEN game_stats.best_time_ms IS NULL THEN excluded.best_time_ms
         WHEN excluded.best_time_ms IS NULL THEN game_stats.best_time_ms
         ELSE min(game_stats.best_time_ms, excluded.best_time_ms)
       END,
       total_time_ms = max(game_stats.total_time_ms, excluded.total_time_ms),
       updated_at = excluded.updated_at`,
  ).bind(userId, gameId, difficulty, completedCount, bestTimeMs, totalTimeMs, Date.now())
}

/** Unlike the live daily-score upsert (handlePostDailyScore), this never overwrites
 *  an existing row — backfilled history is strictly lower-priority than a real
 *  synced completion, so a genuine score always wins over an imported one. */
function dailyScoreInsertIfAbsent(
  env: Env,
  userId: string,
  gameId: string,
  dateKey: string,
  elapsedMs: number | null,
  guesses: number | null,
  assisted: boolean,
): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO daily_scores (user_id, game_id, date_key, elapsed_ms, guesses, assisted, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, game_id, date_key) DO NOTHING`,
  ).bind(userId, gameId, dateKey, elapsedMs, guesses, assisted ? 1 : 0, Date.now())
}

interface DailyScoreBody {
  gameId?: string
  dateKey?: string
  elapsedMs?: number
  guesses?: number
  assisted?: boolean
}

export const handlePostDailyScore = withAuth(async ({ request, env, user }: AuthedContext) => {
  const body = await readJson<DailyScoreBody>(request)
  if (!body || !isGameId(body.gameId) || !isValidDateKey(body.dateKey)) {
    return errorResponse('A valid gameId and dateKey are required')
  }

  let elapsedMs: number | null = null
  let guesses: number | null = null

  if (body.gameId === 'wordle') {
    if (!Number.isInteger(body.guesses) || body.guesses! < 1 || body.guesses! > WORDLE_MAX_GUESSES) {
      return errorResponse(`guesses must be an integer between 1 and ${WORDLE_MAX_GUESSES}`)
    }
    guesses = body.guesses!
  } else {
    if (typeof body.elapsedMs !== 'number' || body.elapsedMs < MIN_ELAPSED_MS) {
      return errorResponse('elapsedMs is missing or implausibly fast')
    }
    elapsedMs = body.elapsedMs
  }

  await env.DB.prepare(
    `INSERT INTO daily_scores (user_id, game_id, date_key, elapsed_ms, guesses, assisted, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, game_id, date_key) DO UPDATE SET
       elapsed_ms = excluded.elapsed_ms, guesses = excluded.guesses,
       assisted = excluded.assisted, completed_at = excluded.completed_at`,
  )
    .bind(user.id, body.gameId, body.dateKey, elapsedMs, guesses, body.assisted ? 1 : 0, Date.now())
    .run()

  return json({ ok: true })
})

interface DailyLeaderboardRow {
  user_id: string
  username: string
  avatar_type: string
  avatar_value: string
  elapsed_ms: number | null
  guesses: number | null
  assisted: number
}

export const handleGetDailyLeaderboard = withAuth(async ({ env, user, params }: AuthedContext) => {
  if (!isGameId(params.gameId)) return errorResponse('Unknown game', 404)
  // Reading is allowed for any real past date, not just the ±2-day window a live
  // submission is checked against — otherwise backfilled history (see
  // handlePostScoreBackfill) would never be viewable. isPlausibleHistoricalDateKey
  // still rejects garbage/future dates.
  if (!isPlausibleHistoricalDateKey(params.dateKey)) return errorResponse('Invalid date', 400)

  const friendIds = await getFriendIds(env, user.id)
  const placeholders = friendIds.map(() => '?').join(',')
  const rows = await env.DB.prepare(
    `SELECT ds.user_id, u.username, u.avatar_type, u.avatar_value, ds.elapsed_ms, ds.guesses, ds.assisted
     FROM daily_scores ds JOIN users u ON u.id = ds.user_id
     WHERE ds.game_id = ? AND ds.date_key = ? AND ds.user_id IN (${placeholders})`,
  )
    .bind(params.gameId, params.dateKey, ...friendIds)
    .all<DailyLeaderboardRow>()

  const isWordle = params.gameId === 'wordle'
  const entries = rows.results
    .map((row) => ({
      userId: row.user_id,
      username: row.username,
      avatarType: row.avatar_type,
      avatarValue: row.avatar_value,
      elapsedMs: row.elapsed_ms,
      guesses: row.guesses,
      assisted: !!row.assisted,
    }))
    .sort((a, b) => (isWordle ? (a.guesses ?? Infinity) - (b.guesses ?? Infinity) : (a.elapsedMs ?? Infinity) - (b.elapsedMs ?? Infinity)))

  return json({ entries })
})

interface GameScoreBody {
  gameId?: string
  difficulty?: string
  completedCount?: number
  bestTimeMs?: number | null
  totalTimeMs?: number
}

export const handlePostGameScore = withAuth(async ({ request, env, user }: AuthedContext) => {
  const body = await readJson<GameScoreBody>(request)
  if (
    !body ||
    !isGameId(body.gameId) ||
    !isDifficultyId(body.difficulty) ||
    typeof body.completedCount !== 'number' ||
    typeof body.totalTimeMs !== 'number'
  ) {
    return errorResponse('gameId, difficulty, completedCount, and totalTimeMs are required')
  }

  await gameStatUpsert(env, user.id, body.gameId, body.difficulty, body.completedCount, body.bestTimeMs ?? null, body.totalTimeMs).run()

  return json({ ok: true })
})

interface BackfillBody {
  gameStats?: { gameId?: string; difficulty?: string; completedCount?: number; bestTimeMs?: number | null; totalTimeMs?: number }[]
  dailyScores?: { gameId?: string; dateKey?: string; elapsedMs?: number; guesses?: number; assisted?: boolean }[]
}

// Generous headroom over anything a real device could have: 6 games x 3
// difficulties for gameStats, and years of daily history across 6 games for
// dailyScores — see the plan's cost analysis, this is nowhere close to a quota
// concern, just a sane upper bound on one request's payload.
const MAX_BACKFILL_GAME_STATS = 32
const MAX_BACKFILL_DAILY_SCORES = 5000

/** One-time seed of this account's leaderboard tables from a device's existing local
 *  history — called only when a device first links to a brand-new account (see
 *  src/hooks/useBackupSync.tsx), so a returning player's friends-leaderboard stats
 *  reflect real past performance instead of starting at zero. Silently skips any
 *  malformed entry rather than failing the whole request — this is best-effort
 *  seeding of the caller's own data, not a strict API contract. */
export const handlePostScoreBackfill = withAuth(async ({ request, env, user }: AuthedContext) => {
  const body = await readJson<BackfillBody>(request)
  if (!body) return errorResponse('Missing body')

  const gameStats = body.gameStats ?? []
  const dailyScores = body.dailyScores ?? []
  if (gameStats.length > MAX_BACKFILL_GAME_STATS || dailyScores.length > MAX_BACKFILL_DAILY_SCORES) {
    return errorResponse('Too many entries')
  }

  const statements: D1PreparedStatement[] = []

  for (const entry of gameStats) {
    if (!isGameId(entry.gameId) || !isDifficultyId(entry.difficulty)) continue
    if (typeof entry.completedCount !== 'number' || typeof entry.totalTimeMs !== 'number') continue
    if (entry.completedCount <= 0) continue
    statements.push(
      gameStatUpsert(env, user.id, entry.gameId, entry.difficulty, entry.completedCount, entry.bestTimeMs ?? null, entry.totalTimeMs),
    )
  }

  for (const entry of dailyScores) {
    if (!isGameId(entry.gameId) || !isPlausibleHistoricalDateKey(entry.dateKey)) continue
    let elapsedMs: number | null = null
    let guesses: number | null = null
    if (entry.gameId === 'wordle') {
      if (!Number.isInteger(entry.guesses) || entry.guesses! < 1 || entry.guesses! > WORDLE_MAX_GUESSES) continue
      guesses = entry.guesses!
    } else {
      if (typeof entry.elapsedMs !== 'number' || entry.elapsedMs < MIN_ELAPSED_MS) continue
      elapsedMs = entry.elapsedMs
    }
    statements.push(dailyScoreInsertIfAbsent(env, user.id, entry.gameId, entry.dateKey, elapsedMs, guesses, !!entry.assisted))
  }

  if (statements.length > 0) await env.DB.batch(statements)

  return json({ ok: true, applied: statements.length })
})

interface GameLeaderboardRow {
  user_id: string
  username: string
  avatar_type: string
  avatar_value: string
  completed_count: number
  best_time_ms: number | null
  total_time_ms: number
}

export const handleGetGameLeaderboard = withAuth(async ({ env, user, params }: AuthedContext) => {
  if (!isGameId(params.gameId)) return errorResponse('Unknown game', 404)

  const friendIds = await getFriendIds(env, user.id)
  const placeholders = friendIds.map(() => '?').join(',')
  const rows = await env.DB.prepare(
    `SELECT gs.user_id, u.username, u.avatar_type, u.avatar_value,
            SUM(gs.completed_count) AS completed_count, MIN(gs.best_time_ms) AS best_time_ms, SUM(gs.total_time_ms) AS total_time_ms
     FROM game_stats gs JOIN users u ON u.id = gs.user_id
     WHERE gs.game_id = ? AND gs.user_id IN (${placeholders})
     GROUP BY gs.user_id`,
  )
    .bind(params.gameId, ...friendIds)
    .all<GameLeaderboardRow>()

  const entries = rows.results
    .map((row) => ({
      userId: row.user_id,
      username: row.username,
      avatarType: row.avatar_type,
      avatarValue: row.avatar_value,
      completedCount: row.completed_count,
      bestTimeMs: row.best_time_ms,
      averageTimeMs: row.completed_count > 0 ? Math.round(row.total_time_ms / row.completed_count) : null,
    }))
    .sort((a, b) => b.completedCount - a.completedCount)

  return json({ entries })
})
