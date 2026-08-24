import { describe, expect, it } from 'vitest'
import { contradictoryLines, isSolved, wrongCells, type Mark } from './validator'

const SOLUTION = [
  [true, false],
  [false, true],
]

describe('isSolved', () => {
  it('is true once every cell\'s fill state matches the solution', () => {
    const marks: Mark[][] = [
      ['filled', 'empty'],
      ['empty', 'filled'],
    ]
    expect(isSolved(2, SOLUTION, marks)).toBe(true)
  })

  it('ignores X marks — they only need to not be filled', () => {
    const marks: Mark[][] = [
      ['filled', 'x'],
      ['x', 'filled'],
    ]
    expect(isSolved(2, SOLUTION, marks)).toBe(true)
  })

  it('is false while a filled cell is missing', () => {
    const marks: Mark[][] = [
      ['empty', 'empty'],
      ['empty', 'filled'],
    ]
    expect(isSolved(2, SOLUTION, marks)).toBe(false)
  })
})

describe('wrongCells', () => {
  it('never flags an untouched empty cell', () => {
    const marks: Mark[][] = [
      ['empty', 'empty'],
      ['empty', 'empty'],
    ]
    expect(wrongCells(2, SOLUTION, marks)).toEqual([])
  })

  it('flags a filled cell that should be empty', () => {
    const marks: Mark[][] = [
      ['filled', 'filled'],
      ['empty', 'filled'],
    ]
    expect(wrongCells(2, SOLUTION, marks)).toEqual([{ row: 0, col: 1 }])
  })

  it('flags an X sitting on a cell that should be filled', () => {
    const marks: Mark[][] = [
      ['x', 'empty'],
      ['empty', 'empty'],
    ]
    expect(wrongCells(2, SOLUTION, marks)).toEqual([{ row: 0, col: 0 }])
  })

  it('does not flag an X correctly marking an empty cell', () => {
    const marks: Mark[][] = [
      ['filled', 'x'],
      ['x', 'filled'],
    ]
    expect(wrongCells(2, SOLUTION, marks)).toEqual([])
  })
})

describe('contradictoryLines', () => {
  // Row 0's clue [1] (one filled cell) — filling both cells satisfies no placement.
  const rowClues = [[1], [1]]
  const colClues = [[1], [1]]

  it('is empty for marks still consistent with every clue', () => {
    const marks: Mark[][] = [
      ['filled', 'empty'],
      ['empty', 'empty'],
    ]
    expect(contradictoryLines(2, rowClues, colClues, marks)).toEqual({ rows: new Set(), cols: new Set() })
  })

  it('flags a row that no longer matches any placement of its own clue', () => {
    const marks: Mark[][] = [
      ['filled', 'filled'], // clue [1] can never place two filled cells
      ['empty', 'empty'],
    ]
    const result = contradictoryLines(2, rowClues, colClues, marks)
    expect(result.rows).toEqual(new Set([0]))
  })

  it('never flags an under-filled line — only a self-contradictory one', () => {
    const marks: Mark[][] = [
      ['empty', 'empty'],
      ['empty', 'empty'],
    ]
    expect(contradictoryLines(2, rowClues, colClues, marks)).toEqual({ rows: new Set(), cols: new Set() })
  })
})
