import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Difficulty, LevelRecord } from '../engine/types'
import type { SudokuLevelRecord } from '../engine/sudoku/types'
import type { Coord, ZipLevelRecord } from '../engine/zip/types'
import type { PatchesLevelRecord } from '../engine/patches/types'
import type { PlacedRect } from '../engine/patches/validator'
import type { CellState } from '../state/types'
import type { SudokuCellState } from '../state/sudokuTypes'

const DB_NAME = 'queens-pwa'
const DB_VERSION = 4

export interface Settings {
  autoPlaceX: boolean
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
}

const DEFAULT_SETTINGS: Settings = { autoPlaceX: true }

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
      },
    })
  }
  return dbPromise
}

export async function getSettings(): Promise<Settings> {
  const db = await getDB()
  return (await db.get('settings', 'global')) ?? DEFAULT_SETTINGS
}

export async function setAutoPlaceX(autoPlaceX: boolean): Promise<void> {
  const db = await getDB()
  await db.put('settings', { autoPlaceX }, 'global')
}

export async function getProgress(difficulty: Difficulty): Promise<DifficultyProgress> {
  const db = await getDB()
  return (await db.get('progress', difficulty)) ?? defaultProgress(difficulty)
}

/** Increments completion stats and advances the bank pointer, in one transaction. Clears any in-progress save. */
export async function recordCompletion(difficulty: Difficulty, elapsedMs: number): Promise<DifficultyProgress> {
  const db = await getDB()
  const tx = db.transaction(['progress', 'inProgress'], 'readwrite')
  const progressStore = tx.objectStore('progress')
  const current = (await progressStore.get(difficulty)) ?? defaultProgress(difficulty)
  const next: DifficultyProgress = {
    difficulty,
    completedCount: current.completedCount + 1,
    totalTimeMs: current.totalTimeMs + elapsedMs,
    currentLevelIndex: current.currentLevelIndex + 1,
    // Records written before this field existed have bestTimeMs === undefined at
    // runtime (IndexedDB values are schemaless — old stored objects don't retroactively
    // gain new fields), so this must check == null rather than === null.
    bestTimeMs: current.bestTimeMs == null ? elapsedMs : Math.min(current.bestTimeMs, elapsedMs),
  }
  await progressStore.put(next, difficulty)
  await tx.objectStore('inProgress').delete(difficulty)
  await tx.done
  return next
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

/** Increments completion stats and advances the bank pointer, in one transaction. Clears any in-progress save. */
export async function recordSudokuCompletion(difficulty: Difficulty, elapsedMs: number): Promise<DifficultyProgress> {
  const db = await getDB()
  const tx = db.transaction(['sudokuProgress', 'sudokuInProgress'], 'readwrite')
  const progressStore = tx.objectStore('sudokuProgress')
  const current = (await progressStore.get(difficulty)) ?? defaultProgress(difficulty)
  const next: DifficultyProgress = {
    difficulty,
    completedCount: current.completedCount + 1,
    totalTimeMs: current.totalTimeMs + elapsedMs,
    currentLevelIndex: current.currentLevelIndex + 1,
    bestTimeMs: current.bestTimeMs == null ? elapsedMs : Math.min(current.bestTimeMs, elapsedMs),
  }
  await progressStore.put(next, difficulty)
  await tx.objectStore('sudokuInProgress').delete(difficulty)
  await tx.done
  return next
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

/** Increments completion stats and advances the bank pointer, in one transaction. Clears any in-progress save. */
export async function recordZipCompletion(difficulty: Difficulty, elapsedMs: number): Promise<DifficultyProgress> {
  const db = await getDB()
  const tx = db.transaction(['zipProgress', 'zipInProgress'], 'readwrite')
  const progressStore = tx.objectStore('zipProgress')
  const current = (await progressStore.get(difficulty)) ?? defaultProgress(difficulty)
  const next: DifficultyProgress = {
    difficulty,
    completedCount: current.completedCount + 1,
    totalTimeMs: current.totalTimeMs + elapsedMs,
    currentLevelIndex: current.currentLevelIndex + 1,
    bestTimeMs: current.bestTimeMs == null ? elapsedMs : Math.min(current.bestTimeMs, elapsedMs),
  }
  await progressStore.put(next, difficulty)
  await tx.objectStore('zipInProgress').delete(difficulty)
  await tx.done
  return next
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

/** Increments completion stats and advances the bank pointer, in one transaction. Clears any in-progress save. */
export async function recordPatchesCompletion(difficulty: Difficulty, elapsedMs: number): Promise<DifficultyProgress> {
  const db = await getDB()
  const tx = db.transaction(['patchesProgress', 'patchesInProgress'], 'readwrite')
  const progressStore = tx.objectStore('patchesProgress')
  const current = (await progressStore.get(difficulty)) ?? defaultProgress(difficulty)
  const next: DifficultyProgress = {
    difficulty,
    completedCount: current.completedCount + 1,
    totalTimeMs: current.totalTimeMs + elapsedMs,
    currentLevelIndex: current.currentLevelIndex + 1,
    bestTimeMs: current.bestTimeMs == null ? elapsedMs : Math.min(current.bestTimeMs, elapsedMs),
  }
  await progressStore.put(next, difficulty)
  await tx.objectStore('patchesInProgress').delete(difficulty)
  await tx.done
  return next
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
