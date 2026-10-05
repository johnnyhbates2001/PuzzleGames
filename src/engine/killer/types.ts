import type { Coord, SudokuLevelRecord } from '../sudoku/types.ts'

export type { Coord, Difficulty, DigitGrid } from '../sudoku/types.ts'

/** A dashed-outline group of cells whose digits must sum to `sum`, with no digit
 *  repeated inside the cage. */
export interface Cage {
  cells: Coord[]
  sum: number
}

/** Same shape as a classic Sudoku level (so the Sudoku reducer, board, and keypad all
 *  work on it unchanged), plus the cages. `puzzle` is mostly or entirely zeros — cages
 *  are the main clue, givens only appear where generation needed one for uniqueness. */
export interface KillerLevelRecord extends SudokuLevelRecord {
  cages: Cage[]
}

/** 9x9 lookup from cell to its cage's index in `cages`. */
export function cageIndexGrid(cages: Cage[]): number[][] {
  const grid = Array.from({ length: 9 }, () => new Array<number>(9).fill(-1))
  cages.forEach((cage, i) => {
    for (const { row, col } of cage.cells) grid[row][col] = i
  })
  return grid
}

/** The cell a cage's sum label sits in — its top-most, then left-most, cell. */
export function cageLabelCell(cage: Cage): Coord {
  return cage.cells.reduce((best, c) => (c.row < best.row || (c.row === best.row && c.col < best.col) ? c : best))
}
