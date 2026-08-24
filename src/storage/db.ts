import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Difficulty, LevelRecord } from '../engine/types'
import type { SudokuLevelRecord } from '../engine/sudoku/types'
import type { Coord, ZipLevelRecord } from '../engine/zip/types'
import type { PatchesLevelRecord } from '../engine/patches/types'
import type { PlacedRect } from '../engine/patches/validator'
import type { NonogramLevelRecord } from '../engine/nonogram/types'
import type { Mark as NonogramMark } from '../engine/nonogram/validator'
import type { CellState } from '../state/types'
import type { SudokuCellState } from '../state/sudokuTypes'
import type { DailyGameId } from '../games/dailyChallenge'

const DB_NAME = 'queens-pwa'
const DB_VERSION = 7

export interface Settings {
  autoPlaceX: boolean
  coins: number
  ownedSkins: string[]
  equippedSkin: string
  soundEnabled: boolean
  hapticsEnabled: boolean
  /** Completions with no hint used — feeds the "flawless solves" achievement. */
  unassistedCompletions: number
  /** Achievement ids the player has already seen the unlock toast for. */
  seenAchievements: string[]
}

export interface DifficultyProgress {
  difficulty: Difficulty
  completedCount: number
  totalTimeMs: number
  currentLevelIndex: number
  bestTimeMs: number | null
}

export interface InProgressLevel {
  difficulty: Difficulty
  /** Full level record, always — including runtime-generated (non-bank) levels, which have
   *  nothing else to resume from. Also insulates resume from a future bank re-shuffle. */
  level: LevelRecord
  levelSource: 'bank' | 'generated'
  /** Bookkeeping only — never used to reconstruct the level. */
  bankIndex?: number
  board: CellState[][]
  elapsedMs: number
  savedAt: number
}

export interface SudokuInProgressLevel {
  difficulty: Difficulty
  /** Full level record, always — including runtime-generated (non-bank) levels, which have
   *  nothing else to resume from. Also insulates resume from a future bank re-shuffle. */
  level: SudokuLevelRecord
  levelSource: 'bank' | 'generated'
  /** Bookkeeping only — never used to reconstruct the level. */
  bankIndex?: number
  board: SudokuCellState[][]
  elapsedMs: number
  savedAt: number
}

export interface ZipInProgressLevel {
  difficulty: Difficulty
  /** Full level record, always — including runtime-generated (non-bank) levels, which have
   *  nothing else to resume from. Also insulates resume from a future bank re-shuffle. */
  level: ZipLevelRecord
  levelSource: 'bank' | 'generated'
  /** Bookkeeping only — never used to reconstruct the level. */
  bankIndex?: number
  path: Coord[]
  elapsedMs: number
  savedAt: number
}

export interface PatchesInProgressLevel {
  difficulty: Difficulty
  /** Full level record, always — including runtime-generated (non-bank) levels, which have
   *  nothing else to resume from. Also insulates resume from a future bank re-shuffle. */
  level: PatchesLevelRecord
  levelSource: 'bank' | 'generated'
  /** Bookkeeping only — never used to reconstruct the level. */
  bankIndex?: number
  placed: PlacedRect[]
  elapsedMs: number
  savedAt: number
}

export interface NonogramInProgressLevel {
  difficulty: Difficulty
  /** Full level record, always — including runtime-generated (non-bank) levels, which have
   *  nothing else to resume from. Also insulates resume from a future bank re-shuffle. */
  level: NonogramLevelRecord
  levelSource: 'bank' | 'generated'
  /** Bookkeeping only — never used to reconstruct the level. */
  bankIndex?: number
  grid: NonogramMark[][]
  elapsedMs: number
  savedAt: number
}

export interface DailyChallengeRecord {
  gameId: DailyGameId
  completedAt: number
  elapsedMs: number
  assisted: boolean
}

// `Difficulty` above is imported from the Queens engine, but the literal set
// ('easy'|'medium'|'hard') is identical to every other game's own Difficulty type, so
// it doubles as the key type for their stores below without a second import.
interface QueensDB extends DBSchema {
  settings: { key: 'global'; value: Settings }
  progress: { key: Difficulty; value: DifficultyProgress }
  inProgress: { key: Difficulty; value: InProgressLevel }
  sudokuProgress: { key: Difficulty; value: DifficultyProgress }
  sudokuInProgress: { key: Difficulty; value: SudokuInProgressLevel }
  zipProgress: { key: Difficulty; value: DifficultyProgress }
  zipInProgress: { key: Difficulty; value: ZipInProgressLevel }
  patchesProgress: { key: Difficulty; value: DifficultyProgress }
  patchesInProgress: { key: Difficulty; value: PatchesInProgressLevel }
  nonogramProgress: { key: Difficulty; value: DifficultyProgress }
  nonogramInProgress: { key: Difficulty; value: NonogramInProgressLevel }
  /** Key = local date string ('YYYY-MM-DD'). Value = number of levels completed that day,
   *  across every game — feeds the home-screen streak and the stats-page heatmap. */
  dailyActivity: { key: string; value: number }
  /** Key = local date string ('YYYY-MM-DD'). One row per day, written only when that
   *  day's featured Daily Challenge puzzle is completed. */
  dailyChallenge: { key: string; value: DailyChallengeRecord }
}

const DEFAULT_SETTINGS: Settings = {
  autoPlaceX: true,
  coins: 0,
  ownedSkins: ['candy'],
  equippedSkin: 'candy',
  soundEnabled: true,
  hapticsEnabled: true,
  unassistedCompletions: 0,
  seenAchievements: [],
}

function defaultProgress(difficulty: Difficulty): DifficultyProgress {
  return { difficulty, completedCount: 0, totalTimeMs: 0, currentLevelIndex: 0, bestTimeMs: null }
}

let dbPromise: Promise<IDBPDatabase<QueensDB>> | null = null

function getDB(): Promise<IDBPDatabase<QueensDB>> {
  if (!dbPromise) {
    dbPromise = openDB<QueensDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('settings')
          db.createObjectStore('progress')
          db.createObjectStore('inProgress')
        }
        if (oldVersion < 2) {
          db.createObjectStore('sudokuProgress')
          db.createObjectStore('sudokuInProgress')
        }
        if (oldVersion < 3) {
          db.createObjectStore('zipProgress')
          db.createObjectStore('zipInProgress')
        }
        if (oldVersion < 4) {
          db.createObjectStore('patchesProgress')
          db.createObjectStore('patchesInProgress')
        }
        if (oldVersion < 5) {
          db.createObjectStore('dailyActivity')
        }
        if (oldVersion < 6) {
          db.createObjectStore('dailyChallenge')
        }
        if (oldVersion < 7) {
          db.createObjectStore('nonogramProgress')
          db.createObjectStore('nonogramInProgress')
        }
      },
    })
  }
  return dbPromise
}

/** Merges with DEFAULT_SETTINGS rather than falling back wholesale, so a settings row
 *  written before a field existed (e.g. `coins`) doesn't come back `undefined` at runtime
 *  — IndexedDB values are schemaless and don't retroactively gain new fields. */
export async function getSettings(): Promise<Settings> {
  const db = await getDB()
  const stored = await db.get('settings', 'global')
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function setAutoPlaceX(autoPlaceX: boolean): Promise<void> {
  const db = await getDB()
  const current = await getSettings()
  await db.put('settings', { ...current, autoPlaceX }, 'global')
}

export async function setSoundEnabled(soundEnabled: boolean): Promise<void> {
  const db = await getDB()
  const current = await getSettings()
  await db.put('settings', { ...current, soundEnabled }, 'global')
}

export async function setHapticsEnabled(hapticsEnabled: boolean): Promise<void> {
  const db = await getDB()
  const current = await getSettings()
  await db.put('settings', { ...current, hapticsEnabled }, 'global')
}

/** Unions newly-seen achievement ids into the stored set — idempotent. */
export async function markAchievementsSeen(ids: string[]): Promise<void> {
  const db = await getDB()
  const current = await getSettings()
  const seen = new Set(current.seenAchievements)
  ids.forEach((id) => seen.add(id))
  await db.put('settings', { ...current, seenAchievements: [...seen] }, 'global')
}

export async function addCoins(delta: number): Promise<number> {
  const db = await getDB()
  const current = await getSettings()
  const coins = Math.max(0, current.coins + delta)
  await db.put('settings', { ...current, coins }, 'global')
  return coins
}

/** Atomic check-then-deduct. Returns false (no state change) if the balance is insufficient. */
export async function spendCoins(amount: number): Promise<boolean> {
  const db = await getDB()
  const current = await getSettings()
  if (current.coins < amount) return false
  await db.put('settings', { ...current, coins: current.coins - amount }, 'global')
  return true
}

/** Buys and equips are separate: buying is a no-op (returns true) if already owned. */
export async function buySkin(skinId: string, price: number): Promise<boolean> {
  const db = await getDB()
  const current = await getSettings()
  if (current.ownedSkins.includes(skinId)) return true
  if (current.coins < price) return false
  await db.put(
    'settings',
    { ...current, coins: current.coins - price, ownedSkins: [...current.ownedSkins, skinId] },
    'global',
  )
  return true
}

export async function equipSkin(skinId: string): Promise<void> {
  const db = await getDB()
  const current = await getSettings()
  await db.put('settings', { ...current, equippedSkin: skinId }, 'global')
}

/** Local (not UTC) date key, so a streak day lines up with the player's own calendar day. */
function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Consecutive-day streak ending today or, if today has no completion yet, ending
 *  yesterday — so the streak doesn't read as broken before the player has had a chance
 *  to solve anything today. */
export async function getStreak(now: number = Date.now()): Promise<number> {
  const db = await getDB()
  const cursor = new Date(now)
  const todayCount = (await db.get('dailyActivity', dateKey(cursor))) ?? 0
  if (todayCount === 0) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (((await db.get('dailyActivity', dateKey(cursor))) ?? 0) > 0) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Daily completion counts for the last `weeks` weeks, oldest first (`weeks * 7` entries,
 *  today last) — the stats page buckets these into heatmap levels for display. */
export async function getHeatmap(weeks = 5, now: number = Date.now()): Promise<number[]> {
  const db = await getDB()
  const days = weeks * 7
  const cursor = new Date(now)
  cursor.setDate(cursor.getDate() - (days - 1))
  const counts: number[] = []
  for (let i = 0; i < days; i++) {
    counts.push((await db.get('dailyActivity', dateKey(cursor))) ?? 0)
    cursor.setDate(cursor.getDate() + 1)
  }
  return counts
}

export async function getProgress(difficulty: Difficulty): Promise<DifficultyProgress> {
  const db = await getDB()
  return (await db.get('progress', difficulty)) ?? defaultProgress(difficulty)
}

export interface CompletionResult {
  progress: DifficultyProgress
  coinsAwarded: number
  isPersonalBest: boolean
  dailyBonusApplied: boolean
}

const COIN_BASE: Record<Difficulty, number> = { easy: 15, medium: 25, hard: 35 }
const PERSONAL_BEST_BONUS = 15

/** Assisted solves (a hint was used) earn the base amount only — no personal-best bonus,
 *  since they also never update bestTimeMs (see finishCompletion). */
export function computeCoinAward(difficulty: Difficulty, isPersonalBest: boolean, assisted: boolean): number {
  const base = COIN_BASE[difficulty]
  return !assisted && isPersonalBest ? base + PERSONAL_BEST_BONUS : base
}

type ProgressStoreName = 'progress' | 'sudokuProgress' | 'zipProgress' | 'patchesProgress' | 'nonogramProgress'
type InProgressStoreName = 'inProgress' | 'sudokuInProgress' | 'zipInProgress' | 'patchesInProgress' | 'nonogramInProgress'

/** Shared by the four record*Completion functions below, which differ only in which
 *  pair of stores they touch. In one transaction: advances the bank pointer, clears the
 *  in-progress save, awards coins, and logs today's completion for the streak/heatmap. */
async function finishCompletion(
  progressStoreName: ProgressStoreName,
  inProgressStoreName: InProgressStoreName,
  difficulty: Difficulty,
  elapsedMs: number,
  assisted: boolean,
): Promise<CompletionResult> {
  const db = await getDB()
  const tx = db.transaction([progressStoreName, inProgressStoreName, 'settings', 'dailyActivity'], 'readwrite')

  const progressStore = tx.objectStore(progressStoreName)
  const current = (await progressStore.get(difficulty)) ?? defaultProgress(difficulty)
  // Records written before bestTimeMs existed have it === undefined at runtime
  // (IndexedDB values are schemaless), so this must check == null rather than === null.
  const isPersonalBest = !assisted && (current.bestTimeMs == null || elapsedMs < current.bestTimeMs)
  const next: DifficultyProgress = {
    difficulty,
    completedCount: current.completedCount + 1,
    totalTimeMs: current.totalTimeMs + elapsedMs,
    currentLevelIndex: current.currentLevelIndex + 1,
    bestTimeMs: isPersonalBest ? elapsedMs : (current.bestTimeMs ?? null),
  }
  await progressStore.put(next, difficulty)
  await tx.objectStore(inProgressStoreName).delete(difficulty)

  const activityStore = tx.objectStore('dailyActivity')
  const key = dateKey(new Date())
  const activityCount = (await activityStore.get(key)) ?? 0
  // First completion of the day (across every game) pays double — see ShopPage's
  // "Daily bonus" copy, which this makes true rather than aspirational.
  const dailyBonusApplied = activityCount === 0
  const coinsAwarded = computeCoinAward(difficulty, isPersonalBest, assisted) * (dailyBonusApplied ? 2 : 1)
  await activityStore.put(activityCount + 1, key)

  const settingsStore = tx.objectStore('settings')
  const currentSettings = { ...DEFAULT_SETTINGS, ...(await settingsStore.get('global')) }
  await settingsStore.put(
    {
      ...currentSettings,
      coins: currentSettings.coins + coinsAwarded,
      unassistedCompletions: currentSettings.unassistedCompletions + (assisted ? 0 : 1),
    },
    'global',
  )

  await tx.done
  return { progress: next, coinsAwarded, isPersonalBest, dailyBonusApplied }
}

/** Increments completion stats and advances the bank pointer. Clears any in-progress
 *  save, awards coins, and logs the completion for the streak/heatmap. Pass
 *  `assisted: true` if a hint was used this level — it still counts toward
 *  completedCount but never sets a new personal best. */
export async function recordCompletion(
  difficulty: Difficulty,
  elapsedMs: number,
  assisted = false,
): Promise<CompletionResult> {
  return finishCompletion('progress', 'inProgress', difficulty, elapsedMs, assisted)
}

export function averageTimeMs(progress: DifficultyProgress): number | null {
  if (progress.completedCount === 0) return null
  return progress.totalTimeMs / progress.completedCount
}

export async function getInProgress(difficulty: Difficulty): Promise<InProgressLevel | undefined> {
  const db = await getDB()
  return db.get('inProgress', difficulty)
}

export async function saveInProgress(entry: InProgressLevel): Promise<void> {
  const db = await getDB()
  await db.put('inProgress', entry, entry.difficulty)
}

export async function clearInProgress(difficulty: Difficulty): Promise<void> {
  const db = await getDB()
  await db.delete('inProgress', difficulty)
}

export async function getSudokuProgress(difficulty: Difficulty): Promise<DifficultyProgress> {
  const db = await getDB()
  return (await db.get('sudokuProgress', difficulty)) ?? defaultProgress(difficulty)
}

/** See recordCompletion — same shape, Sudoku's stores. */
export async function recordSudokuCompletion(
  difficulty: Difficulty,
  elapsedMs: number,
  assisted = false,
): Promise<CompletionResult> {
  return finishCompletion('sudokuProgress', 'sudokuInProgress', difficulty, elapsedMs, assisted)
}

export async function getSudokuInProgress(difficulty: Difficulty): Promise<SudokuInProgressLevel | undefined> {
  const db = await getDB()
  return db.get('sudokuInProgress', difficulty)
}

export async function saveSudokuInProgress(entry: SudokuInProgressLevel): Promise<void> {
  const db = await getDB()
  await db.put('sudokuInProgress', entry, entry.difficulty)
}

export async function clearSudokuInProgress(difficulty: Difficulty): Promise<void> {
  const db = await getDB()
  await db.delete('sudokuInProgress', difficulty)
}

export async function getZipProgress(difficulty: Difficulty): Promise<DifficultyProgress> {
  const db = await getDB()
  return (await db.get('zipProgress', difficulty)) ?? defaultProgress(difficulty)
}

/** See recordCompletion — same shape, Zip's stores. */
export async function recordZipCompletion(
  difficulty: Difficulty,
  elapsedMs: number,
  assisted = false,
): Promise<CompletionResult> {
  return finishCompletion('zipProgress', 'zipInProgress', difficulty, elapsedMs, assisted)
}

export async function getZipInProgress(difficulty: Difficulty): Promise<ZipInProgressLevel | undefined> {
  const db = await getDB()
  return db.get('zipInProgress', difficulty)
}

export async function saveZipInProgress(entry: ZipInProgressLevel): Promise<void> {
  const db = await getDB()
  await db.put('zipInProgress', entry, entry.difficulty)
}

export async function clearZipInProgress(difficulty: Difficulty): Promise<void> {
  const db = await getDB()
  await db.delete('zipInProgress', difficulty)
}

export async function getPatchesProgress(difficulty: Difficulty): Promise<DifficultyProgress> {
  const db = await getDB()
  return (await db.get('patchesProgress', difficulty)) ?? defaultProgress(difficulty)
}

/** See recordCompletion — same shape, Patches' stores. */
export async function recordPatchesCompletion(
  difficulty: Difficulty,
  elapsedMs: number,
  assisted = false,
): Promise<CompletionResult> {
  return finishCompletion('patchesProgress', 'patchesInProgress', difficulty, elapsedMs, assisted)
}

export async function getPatchesInProgress(difficulty: Difficulty): Promise<PatchesInProgressLevel | undefined> {
  const db = await getDB()
  return db.get('patchesInProgress', difficulty)
}

export async function savePatchesInProgress(entry: PatchesInProgressLevel): Promise<void> {
  const db = await getDB()
  await db.put('patchesInProgress', entry, entry.difficulty)
}

export async function clearPatchesInProgress(difficulty: Difficulty): Promise<void> {
  const db = await getDB()
  await db.delete('patchesInProgress', difficulty)
}

export async function getNonogramProgress(difficulty: Difficulty): Promise<DifficultyProgress> {
  const db = await getDB()
  return (await db.get('nonogramProgress', difficulty)) ?? defaultProgress(difficulty)
}

/** See recordCompletion — same shape, Nonogram's stores. */
export async function recordNonogramCompletion(
  difficulty: Difficulty,
  elapsedMs: number,
  assisted = false,
): Promise<CompletionResult> {
  return finishCompletion('nonogramProgress', 'nonogramInProgress', difficulty, elapsedMs, assisted)
}

export async function getNonogramInProgress(difficulty: Difficulty): Promise<NonogramInProgressLevel | undefined> {
  const db = await getDB()
  return db.get('nonogramInProgress', difficulty)
}

export async function saveNonogramInProgress(entry: NonogramInProgressLevel): Promise<void> {
  const db = await getDB()
  await db.put('nonogramInProgress', entry, entry.difficulty)
}

export async function clearNonogramInProgress(difficulty: Difficulty): Promise<void> {
  const db = await getDB()
  await db.delete('nonogramInProgress', difficulty)
}

const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const ALL_PROGRESS_GETTERS = [getProgress, getSudokuProgress, getZipProgress, getPatchesProgress, getNonogramProgress]

/** Total completed levels across every game and difficulty — used for the Stats page's
 *  "Solved" tile and the Neon skin's solve-count unlock. */
export async function getTotalSolved(): Promise<number> {
  const results = await Promise.all(
    ALL_PROGRESS_GETTERS.flatMap((getter) => ALL_DIFFICULTIES.map((d) => getter(d))),
  )
  return results.reduce((sum, p) => sum + p.completedCount, 0)
}

const DAILY_COIN_AWARD = 30

export async function getDailyChallenge(dateKeyStr: string): Promise<DailyChallengeRecord | undefined> {
  const db = await getDB()
  return db.get('dailyChallenge', dateKeyStr)
}

export interface DailyCompletionResult {
  coinsAwarded: number
  streak: number
}

/** Records today's Daily Challenge completion (one row per date, across every game since
 *  only one game is featured per day), awards a flat coin bonus, and logs it toward the
 *  regular streak/heatmap too — it's still a puzzle solved today. */
export async function recordDailyChallengeCompletion(
  gameId: DailyGameId,
  elapsedMs: number,
  assisted: boolean,
): Promise<DailyCompletionResult> {
  const db = await getDB()
  const key = dateKey(new Date())
  const tx = db.transaction(['dailyChallenge', 'settings', 'dailyActivity'], 'readwrite')

  const record: DailyChallengeRecord = { gameId, completedAt: Date.now(), elapsedMs, assisted }
  await tx.objectStore('dailyChallenge').put(record, key)

  const settingsStore = tx.objectStore('settings')
  const currentSettings = { ...DEFAULT_SETTINGS, ...(await settingsStore.get('global')) }
  await settingsStore.put(
    {
      ...currentSettings,
      coins: currentSettings.coins + DAILY_COIN_AWARD,
      unassistedCompletions: currentSettings.unassistedCompletions + (assisted ? 0 : 1),
    },
    'global',
  )

  const activityStore = tx.objectStore('dailyActivity')
  const activityCount = (await activityStore.get(key)) ?? 0
  await activityStore.put(activityCount + 1, key)

  await tx.done
  const streak = await getDailyStreak()
  return { coinsAwarded: DAILY_COIN_AWARD, streak }
}

/** Consecutive-day Daily Challenge streak, same "ending today or yesterday" rule as
 *  getStreak so it doesn't read as broken before the player has solved today's. */
export async function getDailyStreak(now: number = Date.now()): Promise<number> {
  const db = await getDB()
  const cursor = new Date(now)
  const today = await db.get('dailyChallenge', dateKey(cursor))
  if (!today) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (await db.get('dailyChallenge', dateKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
