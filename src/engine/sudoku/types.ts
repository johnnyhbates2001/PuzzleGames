export type Difficulty = 'easy' | 'medium' | 'hard'

export const SUDOKU_SIZE = 9
export const BOX_SIZE = 3

export interface Coord {
  row: number
  col: number
}

/** 9x9 grid of digits 1-9, or 0 for empty. */
export type DigitGrid = number[][]

export interface SudokuLevelRecord {
  id: string
  difficulty: Difficulty
  /** Givens grid — 0 marks a cell the player must fill in. */
  puzzle: DigitGrid
  /** The (verified unique) fully-solved grid. Never shown to the player. */
  solution: DigitGrid
}

export function boxIndex(row: number, col: number): number {
  return Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(col / BOX_SIZE)
}

export function coordKey(c: Coord): string {
  return `${c.row},${c.col}`
}
