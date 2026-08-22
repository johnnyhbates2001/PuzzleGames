import { describe, expect, it } from 'vitest'
import { isMismatched, isRectFree, isSolved, placedRectAt } from './validator'
import type { PatchClue, Rect } from './types'

// Same 2x2 two-wide-dominoes puzzle used in solver.test.ts.
const CLUES: PatchClue[] = [
  { cell: { row: 0, col: 0 }, area: 2, shape: 'wide' },
  { cell: { row: 1, col: 0 }, area: 2, shape: 'wide' },
]
const TOP: Rect = { row: 0, col: 0, width: 2, height: 1 }
const BOTTOM: Rect = { row: 1, col: 0, width: 2, height: 1 }

describe('isRectFree', () => {
  it('allows a rectangle with no placed rectangles yet', () => {
    expect(isRectFree([], CLUES, TOP, 0)).toBe(true)
  })

  it('refuses a rectangle overlapping an already-placed one', () => {
    const placed = [{ rect: TOP, clueIndex: 0 }]
    const overlapping: Rect = { row: 0, col: 0, width: 1, height: 2 } // shares cell (0,0)
    expect(isRectFree(placed, CLUES, overlapping, 1)).toBe(false)
  })

  it('refuses a rectangle that swallows another clue\'s cell', () => {
    const wholeGrid: Rect = { row: 0, col: 0, width: 2, height: 2 }
    expect(isRectFree([], CLUES, wholeGrid, 0)).toBe(false) // contains clue 1's cell too
  })
})

describe('isMismatched', () => {
  it('is false when the rectangle matches the clue exactly', () => {
    expect(isMismatched(TOP, CLUES[0])).toBe(false)
  })

  it('is true when the area is wrong', () => {
    const wrongArea: Rect = { row: 0, col: 0, width: 1, height: 1 }
    expect(isMismatched(wrongArea, CLUES[0])).toBe(true)
  })

  it('is true when the shape orientation is wrong', () => {
    const wrongShape: Rect = { row: 0, col: 0, width: 1, height: 2 } // area matches, but tall not wide
    expect(isMismatched(wrongShape, CLUES[0])).toBe(true)
  })
})

describe('placedRectAt', () => {
  it('finds the rectangle covering a given cell', () => {
    const placed = [
      { rect: TOP, clueIndex: 0 },
      { rect: BOTTOM, clueIndex: 1 },
    ]
    expect(placedRectAt(placed, { row: 1, col: 1 })).toBe(1)
  })

  it('returns -1 for an uncovered cell', () => {
    expect(placedRectAt([{ rect: TOP, clueIndex: 0 }], { row: 1, col: 1 })).toBe(-1)
  })
})

describe('isSolved', () => {
  it('is true once every clue has a matching, non-overlapping rectangle covering the grid', () => {
    const placed = [
      { rect: TOP, clueIndex: 0 },
      { rect: BOTTOM, clueIndex: 1 },
    ]
    expect(isSolved(2, CLUES, placed)).toBe(true)
  })

  it('is false while a clue has no rectangle yet', () => {
    expect(isSolved(2, CLUES, [{ rect: TOP, clueIndex: 0 }])).toBe(false)
  })

  it('is false when a placed rectangle mismatches its clue', () => {
    const wrongShape: Rect = { row: 1, col: 0, width: 1, height: 2 }
    const placed = [
      { rect: TOP, clueIndex: 0 },
      { rect: wrongShape, clueIndex: 1 },
    ]
    expect(isSolved(2, CLUES, placed)).toBe(false)
  })
})
