import { describe, expect, it } from 'vitest'
import { countHamiltonianPaths, solveOne, UNVERIFIED } from './solver'
import { coordKey, edgeKey, type Coord } from './types'

// 2x2 grid has exactly two Hamiltonian paths starting at (0,0):
//   A: (0,0) -> (0,1) -> (1,1) -> (1,0)
//   B: (0,0) -> (1,0) -> (1,1) -> (0,1)
// A wall on the (0,0)-(1,0) edge blocks B's first step, leaving only A.
const START: Coord = { row: 0, col: 0 }
const BLOCKING_WALL = edgeKey({ row: 0, col: 0 }, { row: 1, col: 0 })

describe('countHamiltonianPaths', () => {
  it('reports 2 for the wide-open 2x2 grid (both paths valid)', () => {
    expect(countHamiltonianPaths(2, [START], new Set(), 2)).toBe(2)
  })

  it('reports 1 once a wall blocks the alternate path', () => {
    expect(countHamiltonianPaths(2, [START], new Set([BLOCKING_WALL]), 2)).toBe(1)
  })

  it('respects a low node cap by returning the UNVERIFIED sentinel', () => {
    expect(countHamiltonianPaths(2, [START], new Set(), 2, 1)).toBe(UNVERIFIED)
  })

  it('enforces checkpoint order — rejects a checkpoint set no path can satisfy', () => {
    // The 2x2 grid's only two Hamiltonian paths visit {(1,1),(0,1),(1,0)} in orders
    // (0,1),(1,1),(1,0) and (1,0),(1,1),(0,1) respectively — neither matches this
    // required (1,1),(0,1),(1,0) order, and both of (0,0)'s only neighbors are
    // checkpoints whose index doesn't match the required first step, so there isn't
    // even a legal opening move.
    const impossible = countHamiltonianPaths(
      2,
      [START, { row: 1, col: 1 }, { row: 0, col: 1 }, { row: 1, col: 0 }],
      new Set(),
      2,
    )
    expect(impossible).toBe(0)
  })
})

describe('solveOne', () => {
  it('returns the surviving path once the alternate is walled off', () => {
    const solution = solveOne(2, [START], new Set([BLOCKING_WALL]))
    expect(solution).not.toBeNull()
    expect(solution!.map(coordKey)).toEqual(['0,0', '0,1', '1,1', '1,0'])
  })

  it('returns null when no path satisfies the checkpoints', () => {
    const solution = solveOne(2, [START, { row: 1, col: 1 }, { row: 0, col: 1 }, { row: 1, col: 0 }], new Set())
    expect(solution).toBeNull()
  })
})
