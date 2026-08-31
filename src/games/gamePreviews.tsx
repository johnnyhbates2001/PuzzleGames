import type { ReactNode } from 'react'
import { SudokuGridPreview } from '../components/SudokuGridPreview'
import { ZipGridPreview } from '../components/ZipGridPreview'
import { PatchesGridPreview } from '../components/PatchesGridPreview'
import { NonogramGridPreview } from '../components/NonogramGridPreview'
import {
  getNonogramProgress,
  getPatchesProgress,
  getProgress,
  getSudokuProgress,
  getZipProgress,
  type DifficultyProgress,
} from '../storage/db'
import { DIFFICULTY_SIZE, type Difficulty } from '../engine/types'
import { ZIP_SIZE } from '../engine/zip/types'
import { PATCHES_SIZE } from '../engine/patches/types'
import { NONOGRAM_SIZE } from '../engine/nonogram/types'

/** Small per-game tile art shown on Home and in each game's Chapters/Free-play rows —
 *  Queens has no bespoke preview component, so it falls back to the static app icon. */
export const PREVIEW_BY_ID: Record<string, ReactNode> = {
  queens: <img src="/icons/source.svg" alt="" className="size-full rounded-xl" />,
  sudoku: <SudokuGridPreview />,
  zip: <ZipGridPreview />,
  patches: <PatchesGridPreview />,
  nonogram: <NonogramGridPreview />,
}

export const PROGRESS_GETTER: Record<string, (d: Difficulty) => Promise<DifficultyProgress>> = {
  queens: getProgress,
  sudoku: getSudokuProgress,
  zip: getZipProgress,
  patches: getPatchesProgress,
  nonogram: getNonogramProgress,
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
}

/** Board-size caption for the Free-play tab's three difficulty rows. Sudoku's is a
 *  flat constant (not per-difficulty like the other four games). */
export const SIZE_LABEL: Record<string, (d: Difficulty) => string> = {
  queens: (d) => `${DIFFICULTY_SIZE[d]}×${DIFFICULTY_SIZE[d]}`,
  sudoku: () => '9×9',
  zip: (d) => `${ZIP_SIZE[d]}×${ZIP_SIZE[d]}`,
  patches: (d) => `${PATCHES_SIZE[d]}×${PATCHES_SIZE[d]}`,
  nonogram: (d) => `${NONOGRAM_SIZE[d]}×${NONOGRAM_SIZE[d]}`,
}
