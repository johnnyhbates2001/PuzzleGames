import { describe, expect, it } from 'vitest'
import { countSolutions, solveOne, UNVERIFIED } from './solver'
import type { PatchClue } from './types'

// 2x2 grid, two 1x2 horizontal ("wide") dominoes stacked — the only shape-consistent
// tiling (two vertical dominoes would each be "tall", not "wide").
const CLUES: PatchClue[] = [
  { cell: { row: 0, col: 0 }, area: 2, shape: 'wide' },
  { cell: { row: 1, col: 0 }, area: 2, shape: 'wide' },
]

describe('countSolutions', () => {
  it('reports exactly 1 for a uniquely-solvable clue set', () => {
    expect(countSolutions(2, CLUES, 2)).toBe(1)
  })

  it('reports 0 when the clue set is unsolvable (a shape no valid placement can satisfy)', () => {
    const impossible: PatchClue[] = [{ cell: { row: 0, col: 0 }, area: 3, shape: 'square' }] // 3 has no square factorization
    expect(countSolutions(2, impossible, 2)).toBe(0)
  })

  it('respects a low node cap by returning the UNVERIFIED sentinel', () => {
    expect(countSolutions(2, CLUES, 2, 1)).toBe(UNVERIFIED)
  })
})

describe('solveOne', () => {
  it('returns one rectangle per clue, matching each area/shape and containing its cell', () => {
    const solution = solveOne(2, CLUES)
    expect(solution).toEqual([
      { row: 0, col: 0, width: 2, height: 1 },
      { row: 1, col: 0, width: 2, height: 1 },
    ])
  })

  it('returns null when no placement satisfies the clues', () => {
    const impossible: PatchClue[] = [{ cell: { row: 0, col: 0 }, area: 3, shape: 'square' }]
    expect(solveOne(2, impossible)).toBeNull()
  })
})
