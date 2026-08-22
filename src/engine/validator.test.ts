import { describe, expect, it } from 'vitest'
import { getConflicts, isSolved } from './validator'
import type { Coord, RegionGrid } from './types'

// Same unique 4x4 board used in solver.test.ts.
// Solution: (0,1) (1,3) (2,0) (3,2)
const REGIONS: RegionGrid = [
  [0, 0, 1, 1],
  [2, 0, 0, 1],
  [2, 2, 3, 1],
  [2, 3, 3, 3],
]
const SOLUTION: Coord[] = [
  { row: 0, col: 1 },
  { row: 1, col: 3 },
  { row: 2, col: 0 },
  { row: 3, col: 2 },
]

describe('getConflicts', () => {
  it('flags two queens in the same row', () => {
    const queens: Coord[] = [
      { row: 0, col: 0 },
      { row: 0, col: 2 },
    ]
    const conflicts = getConflicts(queens, REGIONS)
    expect(conflicts.has('0,0')).toBe(true)
    expect(conflicts.has('0,2')).toBe(true)
  })

  it('flags two queens in the same column', () => {
    const queens: Coord[] = [
      { row: 0, col: 0 },
      { row: 3, col: 0 },
    ]
    const conflicts = getConflicts(queens, REGIONS)
    expect(conflicts.has('0,0')).toBe(true)
    expect(conflicts.has('3,0')).toBe(true)
  })

  it('flags two queens in the same colored region', () => {
    // (0,0) and (1,1) are both region 0
    const queens: Coord[] = [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]
    const conflicts = getConflicts(queens, REGIONS)
    expect(conflicts.has('0,0')).toBe(true)
    expect(conflicts.has('1,1')).toBe(true)
  })

  it('flags two queens that are 8-adjacent (including diagonally)', () => {
    const queens: Coord[] = [
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ]
    const conflicts = getConflicts(queens, REGIONS)
    expect(conflicts.has('1,1')).toBe(true)
    expect(conflicts.has('2,2')).toBe(true)
  })

  it('does NOT flag two queens far apart on the same long diagonal', () => {
    // (0,0) and (3,3) sit on the same diagonal but are nowhere near adjacent.
    // Regions/row/col here happen to differ too, isolating the diagonal case.
    const queens: Coord[] = [
      { row: 0, col: 0 },
      { row: 3, col: 3 },
    ]
    const conflicts = getConflicts(queens, REGIONS)
    expect(conflicts.size).toBe(0)
  })

  it('reports no conflicts for the verified solution', () => {
    expect(getConflicts(SOLUTION, REGIONS).size).toBe(0)
  })
})

describe('isSolved', () => {
  it('returns true for the full valid solution', () => {
    expect(isSolved(SOLUTION, 4, REGIONS)).toBe(true)
  })

  it('returns false when queens are missing (partial board)', () => {
    expect(isSolved(SOLUTION.slice(0, 3), 4, REGIONS)).toBe(false)
  })

  it('returns false when a conflict exists even with the right queen count', () => {
    const withConflict: Coord[] = [
      { row: 0, col: 0 },
      { row: 1, col: 3 },
      { row: 2, col: 1 },
      { row: 3, col: 2 },
    ]
    expect(isSolved(withConflict, 4, REGIONS)).toBe(false)
  })
})
