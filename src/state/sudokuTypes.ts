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

export function cloneBoard(board: SudokuCellState[][]): SudokuCellState[][] {
  return board.map((row) => row.map((cell) => ({ ...cell, notes: new Set(cell.notes) })))
}
