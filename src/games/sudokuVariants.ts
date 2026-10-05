import type { Difficulty, DigitGrid, SudokuLevelRecord } from '../engine/sudoku/types'
import type { Cage } from '../engine/killer/types'
import { getConflicts as getSudokuConflicts, isSolved as isSudokuSolved } from '../engine/sudoku/validator'
import { getConflicts as getKillerConflicts, isSolved as isKillerSolved } from '../engine/killer/validator'
import { createSudokuReducer } from '../state/sudokuReducer'
import {
  getKillerInProgress,
  getKillerProgress,
  getSudokuInProgress,
  getSudokuProgress,
  recordKillerCompletion,
  recordSudokuCompletion,
  saveKillerInProgress,
  saveSudokuInProgress,
  type CompletionResult,
  type DifficultyProgress,
  type KillerInProgressLevel,
  type SudokuInProgressLevel,
} from '../storage/db'
import { getFreePlaySudokuLevel, getNextSudokuLevel } from './sudokuLevels'
import { getFreePlayKillerLevel, getNextKillerLevel } from './killerLevels'
import { getDailyKillerLevel, getDailySudokuLevel } from './dailyChallenge'

/**
 * Killer Sudoku is classic Sudoku plus cages — same 9x9 board, keypad, notes, hints and
 * reducer — so rather than a parallel copy of every Sudoku page, the Sudoku pages take a
 * variant and read everything game-specific from here. A classic level simply has no
 * `cages`.
 */

export type SudokuVariantId = 'sudoku' | 'killer'

/** Either variant's level: classic levels leave `cages` undefined. */
export type SudokuFamilyLevel = SudokuLevelRecord & { cages?: Cage[] }

export interface SudokuVariant {
  id: SudokuVariantId
  title: string
  basePath: string
  /** First-guess placeholder for the Timed boss modifier, not derived from real
   *  solve-time data — Killer starts from an empty board, so it gets longer. */
  timedBudgetMs: number
  reducer: ReturnType<typeof createSudokuReducer<SudokuFamilyLevel>>
  getConflicts: (values: DigitGrid, level: SudokuFamilyLevel) => Set<string>
  getNextLevel: (d: Difficulty) => Promise<{ level: SudokuFamilyLevel; source: 'bank' | 'generated'; bankIndex?: number }>
  getFreePlayLevel: (d: Difficulty) => Promise<{ level: SudokuFamilyLevel; source: 'bank' | 'generated' }>
  getDailyLevel: (dateKey: string) => SudokuFamilyLevel
  getProgress: (d: Difficulty) => Promise<DifficultyProgress>
  getInProgress: (d: Difficulty) => Promise<SudokuInProgressLevel | undefined>
  saveInProgress: (entry: SudokuInProgressLevel) => Promise<void>
  recordCompletion: (d: Difficulty, elapsedMs: number, assisted: boolean) => Promise<CompletionResult>
}

export const SUDOKU_VARIANTS: Record<SudokuVariantId, SudokuVariant> = {
  sudoku: {
    id: 'sudoku',
    title: 'Sudoku',
    basePath: '/sudoku',
    timedBudgetMs: 180_000,
    reducer: createSudokuReducer<SudokuFamilyLevel>((_level, values) => isSudokuSolved(values)),
    getConflicts: (values) => getSudokuConflicts(values),
    getNextLevel: getNextSudokuLevel,
    getFreePlayLevel: getFreePlaySudokuLevel,
    getDailyLevel: getDailySudokuLevel,
    getProgress: getSudokuProgress,
    getInProgress: getSudokuInProgress,
    saveInProgress: saveSudokuInProgress,
    recordCompletion: recordSudokuCompletion,
  },
  killer: {
    id: 'killer',
    title: 'Killer Sudoku',
    basePath: '/killer',
    timedBudgetMs: 300_000,
    reducer: createSudokuReducer<SudokuFamilyLevel>((level, values) => isKillerSolved(values, level.cages ?? [])),
    getConflicts: (values, level) => getKillerConflicts(values, level.cages ?? []),
    getNextLevel: getNextKillerLevel,
    getFreePlayLevel: getFreePlayKillerLevel,
    getDailyLevel: getDailyKillerLevel,
    getProgress: getKillerProgress,
    getInProgress: getKillerInProgress,
    saveInProgress: (entry) => saveKillerInProgress(entry as KillerInProgressLevel),
    recordCompletion: recordKillerCompletion,
  },
}
