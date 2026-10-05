import { getConflicts as getSudokuConflicts, isSolved as isSudokuSolved } from '../sudoku/validator.ts'
import type { Cage, DigitGrid } from './types.ts'

/** Cell keys ("row,col") breaking a cage rule: a digit repeated inside a cage, a cage
 *  whose placed digits already exceed its sum, or a full cage that misses its sum. */
export function getCageConflicts(board: DigitGrid, cages: Cage[]): Set<string> {
  const bad = new Set<string>()
  for (const cage of cages) {
    const values = cage.cells.map(({ row, col }) => board[row][col])
    const placed = values.filter((v) => v !== 0)
    const total = placed.reduce((s, v) => s + v, 0)
    const full = placed.length === cage.cells.length
    if (total > cage.sum || (full && total !== cage.sum)) {
      for (const { row, col } of cage.cells) if (board[row][col] !== 0) bad.add(`${row},${col}`)
      continue
    }
    cage.cells.forEach(({ row, col }, i) => {
      const v = values[i]
      if (v !== 0 && values.indexOf(v) !== values.lastIndexOf(v)) bad.add(`${row},${col}`)
    })
  }
  return bad
}

/** Classic row/col/box conflicts plus cage conflicts. */
export function getConflicts(board: DigitGrid, cages: Cage[]): Set<string> {
  const bad = getSudokuConflicts(board)
  for (const key of getCageConflicts(board, cages)) bad.add(key)
  return bad
}

export function isSolved(board: DigitGrid, cages: Cage[]): boolean {
  return isSudokuSolved(board) && getCageConflicts(board, cages).size === 0
}
