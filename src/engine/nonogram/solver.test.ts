import { describe, expect, it } from 'vitest'
import { lineSolve, linePlacements, solveByLogic } from './solver'
import { cluesFromSolution } from './types'

describe('linePlacements', () => {
  it('enumerates every valid arrangement of a single run', () => {
    // A run of 2 in a line of length 4: starts at 0, 1, or 2.
    const placements = linePlacements(4, [2])
    expect(placements).toEqual([
      [true, true, false, false],
      [false, true, true, false],
      [false, false, true, true],
    ])
  })

  it('returns one all-empty placement for a [0] clue', () => {
    expect(linePlacements(3, [0])).toEqual([[false, false, false]])
  })

  it('enforces at least one gap between runs', () => {
    const placements = linePlacements(3, [1, 1])
    expect(placements).toEqual([
      [true, false, true],
    ])
  })
})

describe('lineSolve', () => {
  it('forces every cell when only one placement is consistent', () => {
    const forced = lineSolve(3, [3], [null, null, null])
    expect(forced).toEqual([true, true, true])
  })

  it('forces only the cells that agree across every consistent placement', () => {
    // A run of 2 in length 3: [T,T,F] or [F,T,T] — only the middle cell is forced.
    const forced = lineSolve(3, [2], [null, null, null])
    expect(forced).toEqual([null, true, null])
  })

  it('narrows further once a cell is already known', () => {
    // Same [2]-in-3 line, but cell 0 is known filled — only [T,T,F] remains.
    const forced = lineSolve(3, [2], [true, null, null])
    expect(forced).toEqual([true, true, false])
  })
})

describe('solveByLogic', () => {
  it('fully solves a grid whose clues alone determine every cell', () => {
    // A filled top row and left column pin every other cell to empty by elimination —
    // an asymmetric example (row/col clues aren't interchangeable) that also exercises
    // the row-major vs. column-major indexing distinctly.
    const solution = [
      [true, true, true],
      [true, false, false],
      [true, false, false],
    ]
    const { rowClues, colClues } = cluesFromSolution(solution)
    const result = solveByLogic(3, rowClues, colClues)
    expect(result.solved).toBe(true)
    expect(result.grid).toEqual(solution)
  })

  it('gets stuck (not solved) on an ambiguous clue set', () => {
    // A 2x2 checkerboard's row/col clues ([1,1] each way) are also satisfied by its
    // own mirror image, so no amount of line-solving alone can pick one.
    const solution = [
      [true, false],
      [false, true],
    ]
    const { rowClues, colClues } = cluesFromSolution(solution)
    const result = solveByLogic(2, rowClues, colClues)
    expect(result.solved).toBe(false)
  })
})
