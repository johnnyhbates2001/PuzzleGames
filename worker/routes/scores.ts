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

// D1 caps a single statement at 100 bound parameters, and every row below binds 7 —
// so 14 rows per multi-row statement is the most that fits.
const ROWS_PER_STATEMENT = 14

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

function valuesPlaceholders(rowCount: number): string {
  return Array.from({ length: rowCount }, () => '(?, ?, ?, ?, ?, ?, ?)').join(', ')
}

interface GameStatRow {
  gameId: string
  difficulty: string
  completedCount: number
  bestTimeMs: number | null
  totalTimeMs: number
}

/** Self-contained upserts — the "only ever raise the stored value" merge (see the
 *  plan) is expressed directly in SQL via scalar max()/min() against the table's own
 *  current row, so no prior SELECT is needed. That also makes these safe to fire many
 *  of at once via env.DB.batch() (see handlePostScoreBackfill), since each statement
 *  is correct independent of statement order or of what's already stored. Packs up
 *  to ROWS_PER_STATEMENT rows into each statement: D1 counts every statement in a
 *  batch toward its per-request query limit (50 on the Free plan), so one statement
 *  per row made a large backfill fail outright. */
function gameStatUpserts(env: Env, userId: string, rows: GameStatRow[]): D1PreparedStatement[] {
  const now = Date.now()
  return chunk(rows, ROWS_PER_STATEMENT).map((group) =>
    env.DB.prepare(
      `INSERT INTO game_stats (user_id, game_id, difficulty, completed_count, best_time_ms, total_time_ms, updated_at)
       VALUES ${valuesPlaceholders(group.length)}
       ON CONFLICT (user_id, game_id, difficulty) DO UPDATE SET
         completed_count = max(game_stats.completed_count, excluded.completed_count),
         best_time_ms = CASE
           WHEN game_stats.best_time_ms IS NULL THEN excluded.best_time_ms
           WHEN excluded.best_time_ms IS NULL THEN game_stats.best_time_ms
           ELSE min(game_stats.best_time_ms, excluded.best_time_ms)
         END,
         total_time_ms = max(game_stats.total_time_ms, excluded.total_time_ms),
         updated_at = excluded.updated_at`,
    ).bind(...group.flatMap((r) => [userId, r.gameId, r.difficulty, r.completedCount, r.bestTimeMs, r.totalTimeMs, now])),
  )
}

interface DailyScoreRow {
  gameId: string
  dateKey: string
  elapsedMs: number | null
  guesses: number | null
  assisted: boolean
}

/** Unlike the live daily-score upsert (handlePostDailyScore), these never overwrite
 *  an existing row — a resynced score is strictly lower-priority than a live synced
 *  completion, so a genuine score always wins over an imported one. Batched the same
 *  way as gameStatUpserts, for the same reason. */
function dailyScoreInsertsIfAbsent(env: Env, userId: string, rows: DailyScoreRow[]): D1PreparedStatement[] {
  const now = Date.now()
  return chunk(rows, ROWS_PER_STATEMENT).map((group) =>
    env.DB.prepare(
      `INSERT INTO daily_scores (user_id, game_id, date_key, elapsed_ms, guesses, assisted, completed_at)
       VALUES ${valuesPlaceholders(group.length)}
       ON CONFLICT (user_id, game_id, date_key) DO NOTHING`,
    ).bind(...group.flatMap((r) => [userId, r.gameId, r.dateKey, r.elapsedMs, r.guesses, r.assisted ? 1 : 0, now])),
  )
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

interface DailyBoardPlayerRow {
  id: string
  username: string
  avatar_type: string
  avatar_value: string
}

interface DailyBoardScoreRow {
  user_id: string
  game_id: string
  elapsed_ms: number | null
  guesses: number | null
  assisted: number
}

/** Every game's daily scores for one date, for the caller and their friends, in one
 *  request — what the Friends page's Daily view renders as a game-by-player grid.
 *  Players are listed even with no scores yet, so a friend who hasn't played today
 *  still gets a column. Ranking is left to the client, which already needs per-game
 *  rules (Wordle by guesses, everything else by time) to highlight winners. */
export const handleGetDailyBoard = withAuth(async ({ env, user, params }: AuthedContext) => {
  if (!isPlausibleHistoricalDateKey(params.dateKey)) return errorResponse('Invalid date', 400)

  const friendIds = await getFriendIds(env, user.id)
  const placeholders = friendIds.map(() => '?').join(',')
  const [players, scores] = await env.DB.batch([
    env.DB.prepare(`SELECT id, username, avatar_type, avatar_value FROM users WHERE id IN (${placeholders})`).bind(...friendIds),
    env.DB.prepare(
      `SELECT user_id, game_id, elapsed_ms, guesses, assisted FROM daily_scores
       WHERE date_key = ? AND user_id IN (${placeholders})`,
    ).bind(params.dateKey, ...friendIds),
  ])

  return json({
    players: (players.results as unknown as DailyBoardPlayerRow[]).map((row) => ({
      userId: row.id,
      username: row.username,
      avatarType: row.avatar_type,
      avatarValue: row.avatar_value,
      isMe: row.id === user.id,
    })),
    scores: (scores.results as unknown as DailyBoardScoreRow[]).map((row) => ({
      userId: row.user_id,
      gameId: row.game_id,
      elapsedMs: row.elapsed_ms,
      guesses: row.guesses,
      assisted: !!row.assisted,
    })),
  })
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

  const [statement] = gameStatUpserts(env, user.id, [
    { gameId: body.gameId, difficulty: body.difficulty, completedCount: body.completedCount, bestTimeMs: body.bestTimeMs ?? null, totalTimeMs: body.totalTimeMs },
  ])
  await statement.run()

  return json({ ok: true })
})

interface BackfillBody {
  gameStats?: { gameId?: string; difficulty?: string; completedCount?: number; bestTimeMs?: number | null; totalTimeMs?: number }[]
  dailyScores?: { gameId?: string; dateKey?: string; elapsedMs?: number; guesses?: number; assisted?: boolean }[]
}

// Per-request caps, sized so a full request stays well inside D1's 50-queries-per-
// invocation Free-plan limit: 400 daily scores pack into 29 statements, 32 game stats
// into 3, plus the session lookup. A device with more history than that (a year of
// all 8 dailies is ~2900) sends it over several requests — see src/sync/backfill.ts,
// which mirrors MAX_BACKFILL_DAILY_SCORES as its chunk size.
const MAX_BACKFILL_GAME_STATS = 32
const MAX_BACKFILL_DAILY_SCORES = 400

/** Seeds/repairs this account's leaderboard tables from a device's local history —
 *  called when a device first links to an account, from Settings' "Resync" button,
 *  and (with just the last week of dailies) routinely in the background, so a live
 *  score sync that failed gets filled in later (see src/sync/backfill.ts). Silently
 *  skips any malformed entry rather than failing the whole request — this is
 *  best-effort seeding of the caller's own data, not a strict API contract. */
export const handlePostScoreBackfill = withAuth(async ({ request, env, user }: AuthedContext) => {
  const body = await readJson<BackfillBody>(request)
  if (!body) return errorResponse('Missing body')

  const gameStats = body.gameStats ?? []
  const dailyScores = body.dailyScores ?? []
  if (gameStats.length > MAX_BACKFILL_GAME_STATS || dailyScores.length > MAX_BACKFILL_DAILY_SCORES) {
    return errorResponse('Too many entries')
  }

  const statRows: GameStatRow[] = []
  for (const entry of gameStats) {
    if (!isGameId(entry.gameId) || !isDifficultyId(entry.difficulty)) continue
    if (typeof entry.completedCount !== 'number' || typeof entry.totalTimeMs !== 'number') continue
    if (entry.completedCount <= 0) continue
    statRows.push({
      gameId: entry.gameId,
      difficulty: entry.difficulty,
      completedCount: entry.completedCount,
      bestTimeMs: entry.bestTimeMs ?? null,
      totalTimeMs: entry.totalTimeMs,
    })
  }

  const dailyRows: DailyScoreRow[] = []
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
    dailyRows.push({ gameId: entry.gameId, dateKey: entry.dateKey, elapsedMs, guesses, assisted: !!entry.assisted })
  }

  const statements = [...gameStatUpserts(env, user.id, statRows), ...dailyScoreInsertsIfAbsent(env, user.id, dailyRows)]
  if (statements.length > 0) await env.DB.batch(statements)

  return json({ ok: true, applied: statRows.length + dailyRows.length })
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
