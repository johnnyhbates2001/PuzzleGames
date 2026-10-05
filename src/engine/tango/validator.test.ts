import { describe, expect, it } from 'vitest'
import { getConflicts, isSolved } from './validator'
import { propagate } from './solver'
import { EMPTY, MOON, SUN, type EdgeClue, type TangoGrid } from './types'

const S = SUN
const M = MOON
const _ = EMPTY

const SOLVED: TangoGrid = [
  [S, S, M, S, M, M],
  [M, M, S, M, S, S],
  [S, M, S, S, M, M],
  [M, S, M, M, S, S],
  [S, M, M, S, M, S],
  [M, S, S, M, S, M],
]

describe('getConflicts', () => {
  it('reports nothing on a valid solved board', () => {
    expect(getConflicts(SOLVED, []).size).toBe(0)
    expect(isSolved(SOLVED, [])).toBe(true)
  })

  it('flags three in a row', () => {
    const grid: TangoGrid = [
      [S, S, S, _, _, _],
      ...Array.from({ length: 5 }, () => new Array(6).fill(_)),
    ]
    expect([...getConflicts(grid, [])].sort()).toEqual(['0,0', '0,1', '0,2'])
  })

  it('flags a line with more than half of one symbol', () => {
    const grid: TangoGrid = [
      [S, _, S, M, S, S],
      ...Array.from({ length: 5 }, () => new Array(6).fill(_)),
    ]
    expect(getConflicts(grid, []).has('0,0')).toBe(true)
    expect(getConflicts(grid, []).has('0,3')).toBe(false)
  })

  it('flags both sides of a violated sign', () => {
    const edges: EdgeClue[] = [{ row: 0, col: 0, dir: 'right', kind: 'diff' }]
    expect([...getConflicts(SOLVED, edges)].sort()).toEqual(['0,0', '0,1'])
    expect(isSolved(SOLVED, edges)).toBe(false)
  })
})

describe('propagate', () => {
  it('fills the opposite symbol across a = / × sign', () => {
    const grid: TangoGrid = Array.from({ length: 6 }, () => new Array(6).fill(_))
    grid[0][0] = S
    const edges: EdgeClue[] = [
      { row: 0, col: 0, dir: 'right', kind: 'diff' },
      { row: 0, col: 0, dir: 'down', kind: 'same' },
    ]
    expect(propagate(grid, edges)).toBe(true)
    expect(grid[0][1]).toBe(M)
    expect(grid[1][0]).toBe(S)
  })

  it('blocks a third symbol after two in a row', () => {
    const grid: TangoGrid = Array.from({ length: 6 }, () => new Array(6).fill(_))
    grid[2][1] = M
    grid[2][2] = M
    expect(propagate(grid, [])).toBe(true)
    expect(grid[2][0]).toBe(S)
    expect(grid[2][3]).toBe(S)
  })
})
