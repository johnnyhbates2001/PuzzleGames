import type { DailyBoard, DailyBoardPlayer, DailyBoardScore } from '../api/scores'

export interface DailyBoardCell {
  score: DailyBoardScore | null
  /** Best result for this game among everyone who's played it — every tied player
   *  gets it. Only set once at least two players are on the board, since "best of
   *  one" isn't worth a crown. */
  isBest: boolean
}

export interface DailyBoardRow {
  gameId: string
  /** Keyed by userId; every player on the board has an entry. */
  cells: Record<string, DailyBoardCell>
}

export interface DailyBoardSummary {
  /** The caller first, then friends alphabetically. */
  players: DailyBoardPlayer[]
  rows: DailyBoardRow[]
  /** Games each player won outright (ties count for nobody), keyed by userId. */
  wins: Record<string, number>
  /** Games each player has a result for, keyed by userId. */
  played: Record<string, number>
}

/** Lower is better for both: Wordle is scored by guesses, every other game by time. */
function metric(score: DailyBoardScore): number {
  return (score.gameId === 'wordle' ? score.guesses : score.elapsedMs) ?? Infinity
}

/** Turns the server's flat score list into the Friends page's game-by-player grid,
 *  working out who has the best result in each game and the day's head-to-head tally. */
export function summarizeDailyBoard(board: DailyBoard, gameIds: readonly string[]): DailyBoardSummary {
  const players = [...board.players].sort((a, b) =>
    a.isMe !== b.isMe ? (a.isMe ? -1 : 1) : a.username.localeCompare(b.username),
  )
  const wins: Record<string, number> = {}
  const played: Record<string, number> = {}
  for (const player of players) {
    wins[player.userId] = 0
    played[player.userId] = 0
  }

  const rows = gameIds.map((gameId): DailyBoardRow => {
    const scores = board.scores.filter((s) => s.gameId === gameId && s.userId in wins)
    const best = Math.min(...scores.map(metric))
    const winners = players.length >= 2 ? scores.filter((s) => metric(s) === best) : []
    if (winners.length === 1) wins[winners[0].userId]++
    for (const score of scores) played[score.userId]++

    const cells: Record<string, DailyBoardCell> = {}
    for (const player of players) {
      const score = scores.find((s) => s.userId === player.userId) ?? null
      cells[player.userId] = { score, isBest: winners.some((w) => w.userId === player.userId) }
    }
    return { gameId, cells }
  })

  return { players, rows, wins, played }
}

/** Local date key `offsetDays` from today (0 = today, -1 = yesterday) — stepped by
 *  calendar day rather than by 24h, so a DST change can't skip or repeat a date. */
export function dateKeyForOffset(offsetDays: number, now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayLabel(offsetDays: number, now: Date = new Date()): string {
  if (offsetDays === 0) return 'Today'
  if (offsetDays === -1) return 'Yesterday'
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
