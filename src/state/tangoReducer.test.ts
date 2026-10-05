import { describe, expect, it } from 'vitest'
import { createInitialState, getWrongCells, tangoReducer } from './tangoReducer'
import { EMPTY, MOON, SUN, type TangoGrid, type TangoLevelRecord } from '../engine/tango/types'

const S = SUN
const M = MOON
const SOLUTION: TangoGrid = [
  [S, S, M, S, M, M],
  [M, M, S, M, S, S],
  [S, M, S, S, M, M],
  [M, S, M, M, S, S],
  [S, M, M, S, M, S],
  [M, S, S, M, S, M],
]

function level(missing: Array<[number, number]>): TangoLevelRecord {
  const givens = SOLUTION.map((row) => row.slice())
  for (const [r, c] of missing) givens[r][c] = EMPTY
  return { id: 'test', difficulty: 'easy', size: 6, givens, edges: [], solution: SOLUTION }
}

describe('tangoReducer', () => {
  it('cycles empty → sun → moon → empty and ignores givens', () => {
    let state = createInitialState(level([[0, 0], [0, 2]]))
    state = tangoReducer(state, { type: 'CYCLE_CELL', row: 0, col: 2, now: 0 })
    expect(state.grid[0][2]).toBe(S)
    state = tangoReducer(state, { type: 'CYCLE_CELL', row: 0, col: 2, now: 0 })
    expect(state.grid[0][2]).toBe(M)
    state = tangoReducer(state, { type: 'CYCLE_CELL', row: 0, col: 2, now: 0 })
    expect(state.grid[0][2]).toBe(EMPTY)
    const before = state
    expect(tangoReducer(state, { type: 'CYCLE_CELL', row: 0, col: 1, now: 0 })).toBe(before)
  })

  it('wins once the last cell is correct, and stops the clock', () => {
    let state = createInitialState(level([[0, 0]]))
    state = tangoReducer(state, { type: 'RESUME', now: 1000 })
    state = tangoReducer(state, { type: 'CYCLE_CELL', row: 0, col: 0, now: 4000 })
    expect(state.status).toBe('won')
    expect(state.elapsedMs).toBe(3000)
    expect(state.runStartedAt).toBeNull()
  })

  it('undo restores the previous grid; clear keeps givens', () => {
    let state = createInitialState(level([[0, 0], [5, 5]]))
    state = tangoReducer(state, { type: 'CYCLE_CELL', row: 5, col: 5, now: 0 })
    state = tangoReducer(state, { type: 'UNDO' })
    expect(state.grid[5][5]).toBe(EMPTY)
    state = tangoReducer(state, { type: 'CYCLE_CELL', row: 5, col: 5, now: 0 })
    state = tangoReducer(state, { type: 'CLEAR' })
    expect(state.grid[5][5]).toBe(EMPTY)
    expect(state.grid[0][1]).toBe(S)
  })

  it('reveal hint fills the first wrong-or-empty cell and counts as a hint', () => {
    let state = createInitialState(level([[0, 0], [5, 5]]))
    state = tangoReducer(state, { type: 'HINT_REVEAL_CELL', now: 0 })
    expect(state.grid[0][0]).toBe(SOLUTION[0][0])
    expect(state.hintsUsed).toBe(1)
  })

  it('getWrongCells flags only filled mismatches', () => {
    let state = createInitialState(level([[0, 0], [5, 5]]))
    state = tangoReducer(state, { type: 'CYCLE_CELL', row: 5, col: 5, now: 0 }) // sun, solution is moon
    expect([...getWrongCells(state)]).toEqual(['5,5'])
  })
})
