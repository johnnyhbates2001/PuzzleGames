import { describe, expect, it } from 'vitest'
import { applyCellEntry, isSolved } from './validator'
import { edgeKey, type Coord, type ZipLevelRecord } from './types'

const LEVEL: ZipLevelRecord = {
  id: 'test',
  difficulty: 'easy',
  size: 3,
  checkpoints: [
    { row: 0, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 2 },
  ],
  walls: [edgeKey({ row: 0, col: 1 }, { row: 0, col: 2 })],
  solution: [], // unused by applyCellEntry/isSolved
}

const START: Coord = { row: 0, col: 0 }

describe('applyCellEntry — starting', () => {
  it('starts the path at checkpoint 1', () => {
    const path = applyCellEntry([], LEVEL, START)
    expect(path).toEqual([START])
  })

  it('refuses to start anywhere else', () => {
    const path = applyCellEntry([], LEVEL, { row: 1, col: 1 })
    expect(path).toEqual([])
  })
})

describe('applyCellEntry — extending', () => {
  it('extends to an adjacent, unvisited cell', () => {
    const path = applyCellEntry([START], LEVEL, { row: 0, col: 1 })
    expect(path).toEqual([START, { row: 0, col: 1 }])
  })

  it('refuses a non-adjacent cell', () => {
    const path = applyCellEntry([START], LEVEL, { row: 2, col: 2 })
    expect(path).toEqual([START])
  })

  it('refuses to cross a wall', () => {
    const withMid = [START, { row: 0, col: 1 }]
    const path = applyCellEntry(withMid, LEVEL, { row: 0, col: 2 })
    expect(path).toEqual(withMid) // (0,1)-(0,2) is walled
  })

  it('refuses to revisit a cell already in the path (that is not the previous step)', () => {
    const path4 = [START, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 0 }]
    const result = applyCellEntry(path4, LEVEL, START) // adjacent to (1,0), but visited long ago
    expect(result).toEqual(path4)
  })

  it('enforces checkpoint order — refuses an adjacent but out-of-order checkpoint', () => {
    // (0,1) is checkpoint 3 here, but checkpoint 2 ((2,2), unreachable in one step)
    // hasn't been visited yet — the move must be rejected on ordering alone, not
    // adjacency, so (0,1) is deliberately placed right next to the start.
    const level: ZipLevelRecord = {
      ...LEVEL,
      checkpoints: [START, { row: 2, col: 2 }, { row: 0, col: 1 }],
      walls: [],
    }
    const blocked = applyCellEntry([START], level, { row: 0, col: 1 })
    expect(blocked).toEqual([START])
  })
})

describe('applyCellEntry — backtracking', () => {
  it('dragging back onto the second-to-last cell pops the last step', () => {
    const path = [START, { row: 0, col: 1 }, { row: 1, col: 1 }]
    const result = applyCellEntry(path, LEVEL, { row: 0, col: 1 })
    expect(result).toEqual([START, { row: 0, col: 1 }])
  })

  it('re-tapping the current end cell is a no-op', () => {
    const path = [START, { row: 0, col: 1 }]
    const result = applyCellEntry(path, LEVEL, { row: 0, col: 1 })
    expect(result).toBe(path)
  })
})

describe('isSolved', () => {
  it('is false until every cell is filled', () => {
    expect(isSolved([START], LEVEL)).toBe(false)
  })

  it('is true once the path covers every cell', () => {
    const full: Coord[] = []
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) full.push({ row: r, col: c })
    expect(isSolved(full, LEVEL)).toBe(true)
  })
})
