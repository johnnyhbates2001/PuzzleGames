import { describe, expect, it } from 'vitest'
import { countSolutions, solveOne, UNVERIFIED } from './solver'
import { generateSolvedGrid } from './generator'
import { mulberry32 } from '../rng'
import type { DigitGrid } from './types'

const SOLVED = generateSolvedGrid(mulberry32(1))

function blank(grid: DigitGrid, coords: Array<[number, number]>): DigitGrid {
  const copy = grid.map((r) => r.slice())
  for (const [r, c] of coords) copy[r][c] = 0
  return copy
}

// A grid with no givens at all: every row/col/box permutation is a candidate, so it
// has (far) more than one solution — used to exercise the "not unique" path.
const EMPTY_GRID: DigitGrid = Array.from({ length: 9 }, () => new Array(9).fill(0))

describe('solveOne', () => {
  it('completes a partially-filled grid to a valid solution, recovering the original digits', () => {
    const partial = blank(SOLVED, [
      [0, 0],
      [4, 4],
      [8, 8],
    ])
    const solution = solveOne(partial)
    expect(solution).not.toBeNull()
    for (const row of solution!) expect(new Set(row).size).toBe(9)
    expect(solution).toEqual(SOLVED) // this puzzle has a unique solution, so it must match
  })

  it('finds a solution for a fully empty grid', () => {
    expect(solveOne(EMPTY_GRID)).not.toBeNull()
  })
})

describe('countSolutions', () => {
  it('reports exactly 1 for the fully-solved grid itself', () => {
    expect(countSolutions(SOLVED, 2)).toBe(1)
  })

  it('reports exactly 1 for a grid with a single cell blanked', () => {
    const partial = blank(SOLVED, [[3, 5]])
    expect(countSolutions(partial, 2)).toBe(1)
  })

  it('stops early at the limit and reports >= 2 for a wide-open grid', () => {
    const count = countSolutions(EMPTY_GRID, 2)
    expect(count).toBeGreaterThanOrEqual(2)
  })

  it('respects a low node cap by returning the UNVERIFIED sentinel', () => {
    expect(countSolutions(EMPTY_GRID, 2, 1)).toBe(UNVERIFIED)
  })
})
