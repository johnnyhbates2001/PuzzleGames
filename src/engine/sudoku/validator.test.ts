import { describe, expect, it } from 'vitest'
import { getConflicts, isSolved } from './validator'
import type { DigitGrid } from './types'

// A verified valid, fully-solved 9x9 grid (every row/col/3x3 box a permutation of 1-9).
const SOLVED: DigitGrid = [
  [8, 7, 6, 9, 5, 1, 3, 2, 4],
  [3, 2, 5, 6, 8, 4, 7, 9, 1],
  [4, 9, 1, 2, 3, 7, 5, 8, 6],
  [5, 3, 4, 7, 1, 2, 8, 6, 9],
  [2, 1, 7, 8, 6, 9, 4, 5, 3],
  [6, 8, 9, 3, 4, 5, 1, 7, 2],
  [9, 5, 3, 4, 2, 8, 6, 1, 7],
  [1, 4, 2, 5, 7, 6, 9, 3, 8],
  [7, 6, 8, 1, 9, 3, 2, 4, 5],
]

function withCell(grid: DigitGrid, row: number, col: number, value: number): DigitGrid {
  const copy = grid.map((r) => r.slice())
  copy[row][col] = value
  return copy
}

describe('getConflicts', () => {
  it('reports no conflicts for a fully solved grid', () => {
    expect(getConflicts(SOLVED).size).toBe(0)
  })

  it('flags a duplicate within a row', () => {
    const board = withCell(SOLVED, 0, 1, SOLVED[0][0]) // duplicate SOLVED[0][0] into (0,1)
    const conflicts = getConflicts(board)
    expect(conflicts.has('0,0')).toBe(true)
    expect(conflicts.has('0,1')).toBe(true)
  })

  it('flags a duplicate within a column', () => {
    const board = withCell(SOLVED, 1, 0, SOLVED[0][0])
    const conflicts = getConflicts(board)
    expect(conflicts.has('0,0')).toBe(true)
    expect(conflicts.has('1,0')).toBe(true)
  })

  it('flags a duplicate within a 3x3 box', () => {
    // (0,0) and (1,1) share the top-left box.
    const board = withCell(SOLVED, 1, 1, SOLVED[0][0])
    const conflicts = getConflicts(board)
    expect(conflicts.has('0,0')).toBe(true)
    expect(conflicts.has('1,1')).toBe(true)
  })

  it('ignores empty cells', () => {
    const board = withCell(SOLVED, 0, 0, 0)
    expect(getConflicts(board).size).toBe(0)
  })
})

describe('isSolved', () => {
  it('returns true for a complete, conflict-free grid', () => {
    expect(isSolved(SOLVED)).toBe(true)
  })

  it('returns false when a cell is still empty', () => {
    expect(isSolved(withCell(SOLVED, 4, 4, 0))).toBe(false)
  })

  it('returns false when the grid is full but has a conflict', () => {
    const board = withCell(SOLVED, 0, 1, SOLVED[0][0])
    expect(isSolved(board)).toBe(false)
  })
})
