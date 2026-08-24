import { mulberry32 } from '../engine/rng'
import { generateLevel as generateQueensLevel } from '../engine/generator'
import { generateLevel as generateSudokuLevel } from '../engine/sudoku/generator'
import { generateLevel as generateZipLevel } from '../engine/zip/generator'
import { generateLevel as generatePatchesLevel } from '../engine/patches/generator'
import type { LevelRecord } from '../engine/types'
import type { SudokuLevelRecord } from '../engine/sudoku/types'
import type { ZipLevelRecord } from '../engine/zip/types'
import type { PatchesLevelRecord } from '../engine/patches/types'

export const DAILY_GAMES = ['queens', 'sudoku', 'zip', 'patches'] as const
export type DailyGameId = (typeof DAILY_GAMES)[number]

/** The engine difficulty every Daily Challenge is generated at — fixed rather than
 *  player-selected, so "today's puzzle" is a single unambiguous thing to share/compare. */
const DAILY_DIFFICULTY = 'medium'

const GENERATE_RETRIES = 5

/** Local (not UTC) date key, matching storage/db.ts's private dateKey — kept as a small
 *  duplicate here since that one isn't exported and this module has no other reason to
 *  import from storage/db.ts (db.ts already imports DailyGameId from here). */
export function todayDateKey(now: number = Date.now()): string {
  const d = new Date(now)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Which game is featured on a given date — a simple rotation through DAILY_GAMES keyed
 *  off days-since-epoch, so it's stable for any date without needing storage. */
export function gameForDate(dateKey: string): DailyGameId {
  const [y, m, d] = dateKey.split('-').map(Number)
  const daysSinceEpoch = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
  const index = ((daysSinceEpoch % DAILY_GAMES.length) + DAILY_GAMES.length) % DAILY_GAMES.length
  return DAILY_GAMES[index]
}

/** FNV-1a string hash — small, fast, and deterministic, feeding mulberry32 so every
 *  player generates the identical puzzle for a given (gameId, dateKey) with no server. */
export function hashSeed(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function seedFor(gameId: DailyGameId, dateKey: string): number {
  return hashSeed(`${gameId}:${dateKey}`)
}

export function getDailyQueensLevel(dateKey: string): LevelRecord {
  const rng = mulberry32(seedFor('queens', dateKey))
  for (let attempt = 0; attempt < GENERATE_RETRIES; attempt++) {
    const level = generateQueensLevel(DAILY_DIFFICULTY, rng)
    if (level) return { ...level, id: `daily-queens-${dateKey}` }
  }
  throw new Error(`Failed to generate the ${dateKey} Queens daily challenge`)
}

export function getDailySudokuLevel(dateKey: string): SudokuLevelRecord {
  const rng = mulberry32(seedFor('sudoku', dateKey))
  for (let attempt = 0; attempt < GENERATE_RETRIES; attempt++) {
    const level = generateSudokuLevel(DAILY_DIFFICULTY, rng)
    if (level) return { ...level, id: `daily-sudoku-${dateKey}` }
  }
  throw new Error(`Failed to generate the ${dateKey} Sudoku daily challenge`)
}

export function getDailyZipLevel(dateKey: string): ZipLevelRecord {
  const rng = mulberry32(seedFor('zip', dateKey))
  for (let attempt = 0; attempt < GENERATE_RETRIES; attempt++) {
    const level = generateZipLevel(DAILY_DIFFICULTY, rng)
    if (level) return { ...level, id: `daily-zip-${dateKey}` }
  }
  throw new Error(`Failed to generate the ${dateKey} Zip daily challenge`)
}

export function getDailyPatchesLevel(dateKey: string): PatchesLevelRecord {
  const rng = mulberry32(seedFor('patches', dateKey))
  for (let attempt = 0; attempt < GENERATE_RETRIES; attempt++) {
    const level = generatePatchesLevel(DAILY_DIFFICULTY, rng)
    if (level) return { ...level, id: `daily-patches-${dateKey}` }
  }
  throw new Error(`Failed to generate the ${dateKey} Patches daily challenge`)
}
