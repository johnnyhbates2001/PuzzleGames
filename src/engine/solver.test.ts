import { describe, expect, it } from 'vitest'
import { countSolutions, findAlternateSolution, solveOne } from './solver'
import type { RegionGrid } from './types'

// 4x4 board verified (via brute force) to have exactly one solution: queens at
// (0,1) (1,3) (2,0) (3,2) — one per row/col/region, none 8-adjacent.
const UNIQUE_4X4: RegionGrid = [
  [0, 0, 1, 1],
  [2, 0, 0, 1],
  [2, 2, 3, 1],
  [2, 3, 3, 3],
]

// A single region covering the whole board: any placement satisfying row/col
// uniqueness violates the "one per region" rule unless there's only 1 queen,
// so this deliberately has ZERO solutions for n>1 — used to test the zero case.
const NO_REGION_VARIETY: RegionGrid = [
  [0, 0],
  [0, 0],
]

// 4 separate regions but arranged as plain columns/rows with no adjacency
// constraint bite — deliberately ambiguous (more than one valid arrangement).
const AMBIGUOUS_4X4: RegionGrid = [
  [0, 1, 2, 3],
  [0, 1, 2, 3],
  [0, 1, 2, 3],
  [0, 1, 2, 3],
]

describe('solveOne', () => {
  it('finds a valid solution respecting row/col/region/adjacency rules', () => {
    const solution = solveOne(UNIQUE_4X4)
    expect(solution).not.toBeNull()
    const rows = new Set(solution!.map((q) => q.row))
    const cols = new Set(solution!.map((q) => q.col))
    const regionIds = new Set(solution!.map((q) => UNIQUE_4X4[q.row][q.col]))
    expect(rows.size).toBe(4)
    expect(cols.size).toBe(4)
    expect(regionIds.size).toBe(4)
    for (let i = 0; i < solution!.length - 1; i++) {
      const a = solution![i]
      const b = solution![i + 1]
      // consecutive rows must not be adjacent columns
      expect(Math.abs(a.col - b.col)).toBeGreaterThanOrEqual(2)
    }
  })

  it('returns null when no solution exists', () => {
    expect(solveOne(NO_REGION_VARIETY)).toBeNull()
  })
})

describe('countSolutions', () => {
  it('reports exactly 1 for a uniquely-solvable board', () => {
    expect(countSolutions(UNIQUE_4X4, 2)).toBe(1)
  })

  it('reports 0 when no solution exists', () => {
    expect(countSolutions(NO_REGION_VARIETY, 2)).toBe(0)
  })

  it('stops early at the limit and reports >= 2 for an ambiguous board', () => {
    const count = countSolutions(AMBIGUOUS_4X4, 2)
    expect(count).toBeGreaterThanOrEqual(2)
  })

  it('respects a low node cap by returning the UNVERIFIED sentinel', () => {
    const count = countSolutions(AMBIGUOUS_4X4, 2, 1)
    expect(count).toBe(-1)
  })
})

describe('findAlternateSolution', () => {
  it('returns null when the given target is the unique solution', () => {
    const target = solveOne(UNIQUE_4X4)!
    expect(findAlternateSolution(UNIQUE_4X4, target)).toBeNull()
  })

  it('returns a distinct valid solution when one exists', () => {
    const target = solveOne(AMBIGUOUS_4X4)!
    const alt = findAlternateSolution(AMBIGUOUS_4X4, target)
    expect(alt).not.toBeNull()
    expect(alt).not.toEqual(target)
    // the alternate must itself be a valid solution
    const cols = alt!.map((q) => q.col)
    expect(new Set(cols).size).toBe(4)
    const regionIds = new Set(alt!.map((q) => AMBIGUOUS_4X4[q.row][q.col]))
    expect(regionIds.size).toBe(4)
  })
})
