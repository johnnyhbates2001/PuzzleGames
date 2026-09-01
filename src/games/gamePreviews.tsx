import type { ReactNode } from 'react'
import { SudokuGridPreview } from '../components/SudokuGridPreview'
import { ZipGridPreview } from '../components/ZipGridPreview'
import { PatchesGridPreview } from '../components/PatchesGridPreview'
import { NonogramGridPreview } from '../components/NonogramGridPreview'
import { WordleGridPreview } from '../components/WordleGridPreview'
import {
  getNonogramProgress,
  getPatchesProgress,
  getProgress,
  getSudokuProgress,
  getZipProgress,
  getWordleProgress,
  type DifficultyProgress,
} from '../storage/db'
import { DIFFICULTY_SIZE, type Difficulty } from '../engine/types'
import { ZIP_SIZE } from '../engine/zip/types'
import { PATCHES_SIZE } from '../engine/patches/types'
import { NONOGRAM_SIZE } from '../engine/nonogram/types'
import { WORDLE_RULES } from '../engine/wordle/types'
import { getChapterLevels as getQueensChapterLevels } from './queensLevels'
import { getChapterLevels as getSudokuChapterLevels } from './sudokuLevels'
import { getChapterLevels as getZipChapterLevels } from './zipLevels'
import { getChapterLevels as getPatchesChapterLevels } from './patchesLevels'
import { getChapterLevels as getNonogramChapterLevels } from './nonogramLevels'
import { getChapterLevels as getWordleChapterLevels } from './wordleLevels'

/** Small per-game tile art shown on Home and in each game's Chapters/Free-play rows —
 *  Queens has no bespoke preview component, so it falls back to the static app icon. */
export const PREVIEW_BY_ID: Record<string, ReactNode> = {
  queens: <img src="/icons/source.svg" alt="" className="size-full rounded-xl" />,
  sudoku: <SudokuGridPreview />,
  zip: <ZipGridPreview />,
  patches: <PatchesGridPreview />,
  nonogram: <NonogramGridPreview />,
  wordle: <WordleGridPreview />,
}

export const PROGRESS_GETTER: Record<string, (d: Difficulty) => Promise<DifficultyProgress>> = {
  queens: getProgress,
  sudoku: getSudokuProgress,
  zip: getZipProgress,
  patches: getPatchesProgress,
  nonogram: getNonogramProgress,
  wordle: getWordleProgress,
}

/** Fetches one story chapter's 20 levels, in order — powers "replay this chapter"
 *  from ChaptersPage's CompleteRow. Return type is loosely `unknown[]` since
 *  ChaptersPage is generic across games and only ever passes these straight through
 *  to Game*Page's LOAD dispatch, never inspecting their contents. */
export const CHAPTER_LEVELS_GETTER: Record<string, (d: Difficulty, chapterNumber: number) => Promise<unknown[]>> = {
  queens: getQueensChapterLevels,
  sudoku: getSudokuChapterLevels,
  zip: getZipChapterLevels,
  patches: getPatchesChapterLevels,
  nonogram: getNonogramChapterLevels,
  wordle: getWordleChapterLevels,
}

// Every game now has a chapter map, routed to as the primary entry point instead of
// straight to the difficulty picker (still reachable from within Chapters as "Free
// play"). See games/chapters.ts.
export const PRIMARY_ROUTE_OVERRIDE: Record<string, string> = {
  queens: '/queens/chapters',
  sudoku: '/sudoku/chapters',
  zip: '/zip/chapters',
  patches: '/patches/chapters',
  nonogram: '/nonogram/chapters',
  wordle: '/wordle/chapters',
}

/** Board-size caption for the Free-play tab's three difficulty rows. Sudoku's is a
 *  flat constant (not per-difficulty like the other games); Wordle has no board size
 *  to report at all, so it reports its attempt count/Hard Mode instead. */
export const SIZE_LABEL: Record<string, (d: Difficulty) => string> = {
  queens: (d) => `${DIFFICULTY_SIZE[d]}×${DIFFICULTY_SIZE[d]}`,
  sudoku: () => '9×9',
  zip: (d) => `${ZIP_SIZE[d]}×${ZIP_SIZE[d]}`,
  patches: (d) => `${PATCHES_SIZE[d]}×${PATCHES_SIZE[d]}`,
  nonogram: (d) => `${NONOGRAM_SIZE[d]}×${NONOGRAM_SIZE[d]}`,
  wordle: (d) => `${WORDLE_RULES[d].attempts} guesses${WORDLE_RULES[d].hardMode ? ' · Hard mode' : ''}`,
}
