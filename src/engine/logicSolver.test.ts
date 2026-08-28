import { describe, expect, it } from 'vitest'
import { solveByLogic } from './logicSolver'
import type { RegionGrid } from './types'

// 4x4, unique solution (0,1)/(1,3)/(2,0)/(3,2) — verified logic-solvable: found by
// searching generator output for a board the naked-single/pointing/claiming rules
// alone fully determine, with no guessing.
const LOGIC_SOLVABLE_4X4: RegionGrid = [
  [0, 0, 0, 1],
  [2, 2, 2, 1],
  [2, 3, 3, 3],
  [2, 3, 3, 3],
]

// Same fixture used by solver.test.ts as a uniquely-solvable board — verified (here)
// to need backtracking: no naked single, pointing, or claiming move is ever available.
const UNIQUE_BUT_NOT_LOGIC_SOLVABLE_4X4: RegionGrid = [
  [0, 0, 1, 1],
  [2, 0, 0, 1],
  [2, 2, 3, 1],
  [2, 3, 3, 3],
]

describe('solveByLogic', () => {
  it('fully solves a board where deduction alone determines every queen', () => {
    const result = solveByLogic(LOGIC_SOLVABLE_4X4)
    expect(result.solved).toBe(true)
    expect(result.queens).toHaveLength(4)
    const rows = new Set(result.queens.map((q) => q.row))
    const cols = new Set(result.queens.map((q) => q.col))
    const regionIds = new Set(result.queens.map((q) => LOGIC_SOLVABLE_4X4[q.row][q.col]))
    expect(rows.size).toBe(4)
    expect(cols.size).toBe(4)
    expect(regionIds.size).toBe(4)
  })

  it('stops short (without guessing) on a uniquely-solvable board that needs backtracking', () => {
    const result = solveByLogic(UNIQUE_BUT_NOT_LOGIC_SOLVABLE_4X4)
    expect(result.solved).toBe(false)
    expect(result.queens.length).toBeLessThan(4)
  })

  it('never asserts a queen inconsistent with the true solution on the solvable board', () => {
    const result = solveByLogic(LOGIC_SOLVABLE_4X4)
    const solution = new Map(result.queens.map((q) => [q.row, q.col]))
    expect(solution.get(0)).toBe(1)
    expect(solution.get(1)).toBe(3)
    expect(solution.get(2)).toBe(0)
    expect(solution.get(3)).toBe(2)
  })
})
