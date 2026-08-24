import type { DigitGrid } from '../engine/sudoku/types'

/** Per-cell interaction state — shared between the sudoku reducer and the storage layer. */
export interface SudokuCellState {
  value: number
  given: boolean
  /** Pencil-marked candidate digits (1-9). Only meaningful while value === 0. */
  notes: Set<number>
}

export function emptyCell(): SudokuCellState {
  return { value: 0, given: false, notes: new Set() }
}

export function boardFromPuzzle(puzzle: DigitGrid): SudokuCellState[][] {
  return puzzle.map((row) => row.map((v) => ({ value: v, given: v !== 0, notes: new Set<number>() })))
}

export function boardValues(board: SudokuCellState[][]): DigitGrid {
  return board.map((row) => row.map((cell) => cell.value))
}

/** How many of each digit (1-9) are currently placed on the board, indexed by digit
 *  (index 0 unused) — feeds the keypad's "all 9 already placed" greyed-out state. */
export function digitCounts(board: SudokuCellState[][]): number[] {
  const counts = new Array(10).fill(0)
  for (const row of board) {
    for (const cell of row) {
      if (cell.value !== 0) counts[cell.value]++
    }
  }
  return counts
}

export function cloneBoard(board: SudokuCellState[][]): SudokuCellState[][] {
  return board.map((row) => row.map((cell) => ({ ...cell, notes: new Set(cell.notes) })))
}
