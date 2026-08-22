import { describe, expect, it } from 'vitest'
import { createInitialState, getWrongCells, zipReducer, type ZipGameState } from './zipReducer'
import type { ZipLevelRecord } from '../engine/zip/types'

// 2x2 grid, single valid path once (0,0)-(1,0) is walled off (see engine/zip/solver.test.ts).
const LEVEL: ZipLevelRecord = {
  id: 'test-level',
  difficulty: 'easy',
  size: 2,
  checkpoints: [{ row: 0, col: 0 }],
  walls: ['0,0|1,0'],
  solution: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 1, col: 0 },
  ],
}

function fresh(): ZipGameState {
  return createInitialState(LEVEL)
}

function enter(state: ZipGameState, row: number, col: number, now = 0): ZipGameState {
  return zipReducer(state, { type: 'ENTER_CELL', row, col, now })
}

describe('ENTER_CELL', () => {
  it('starts the path at checkpoint 1', () => {
    const state = enter(fresh(), 0, 0)
    expect(state.path).toEqual([{ row: 0, col: 0 }])
  })

  it('is a no-op (same reference) for an illegal move', () => {
    const state = fresh()
    const after = enter(state, 1, 1) // can't start anywhere but (0,0)
    expect(after).toBe(state)
  })

  it('extends the path step by step and detects the win the instant it fills the grid', () => {
    let state = fresh()
    state = enter(state, 0, 0)
    state = enter(state, 0, 1)
    expect(state.status).toBe('playing')
    state = enter(state, 1, 1)
    state = enter(state, 1, 0, 5000)

    expect(state.status).toBe('won')
    expect(state.path.length).toBe(4)
    expect(state.runStartedAt).toBeNull()
  })

  it('freezes further input once won', () => {
    let state = fresh()
    for (const [r, c] of [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ]) {
      state = enter(state, r, c)
    }
    expect(state.status).toBe('won')

    const afterWin = state
    state = enter(state, 1, 0)
    expect(state).toBe(afterWin)
  })
})

describe('undo', () => {
  it('reverts the last step', () => {
    let state = fresh()
    state = enter(state, 0, 0)
    state = enter(state, 0, 1)
    state = zipReducer(state, { type: 'UNDO' })
    expect(state.path).toEqual([{ row: 0, col: 0 }])
  })

  it('is a no-op when there is no history', () => {
    const state = fresh()
    const undone = zipReducer(state, { type: 'UNDO' })
    expect(undone).toBe(state)
  })
})

describe('CLEAR', () => {
  it('empties the path', () => {
    let state = fresh()
    state = enter(state, 0, 0)
    state = enter(state, 0, 1)
    state = zipReducer(state, { type: 'CLEAR', now: 0 })
    expect(state.path).toEqual([])
  })
})

describe('timer', () => {
  it('PAUSE accumulates elapsed time and RESUME restarts the running interval', () => {
    let state = fresh()
    state = zipReducer(state, { type: 'RESUME', now: 0 })
    state = zipReducer(state, { type: 'PAUSE', now: 1000 })
    expect(state.elapsedMs).toBe(1000)
    expect(state.runStartedAt).toBeNull()
  })
})

describe('LOAD', () => {
  it('hydrates a fresh, empty path for a level with no snapshot', () => {
    const state = zipReducer(fresh(), { type: 'LOAD', level: LEVEL })
    expect(state.path).toEqual([])
    expect(state.elapsedMs).toBe(0)
    expect(state.status).toBe('playing')
  })

  it('restores path and elapsedMs from a persisted snapshot', () => {
    let state = fresh()
    state = enter(state, 0, 0)
    const snapshot = { path: state.path, elapsedMs: 4242 }

    const loaded = zipReducer(fresh(), { type: 'LOAD', level: LEVEL, snapshot })
    expect(loaded.path).toEqual([{ row: 0, col: 0 }])
    expect(loaded.elapsedMs).toBe(4242)
  })
})

describe('HINT_REVEAL_NEXT', () => {
  it('appends the first solution step to an empty path', () => {
    const state = zipReducer(fresh(), { type: 'HINT_REVEAL_NEXT', now: 0 })
    expect(state.hintsUsed).toBe(1)
    expect(state.path).toEqual([LEVEL.solution[0]])
  })

  it('appends the next step after a valid partial path', () => {
    let state = enter(fresh(), 0, 0)
    state = zipReducer(state, { type: 'HINT_REVEAL_NEXT', now: 0 })
    expect(state.path).toEqual(LEVEL.solution.slice(0, 2))
  })

  it('wins once the full solution path is revealed', () => {
    let state = fresh()
    for (let i = 0; i < LEVEL.solution.length; i++) {
      state = zipReducer(state, { type: 'HINT_REVEAL_NEXT', now: 0 })
    }
    expect(state.status).toBe('won')
    expect(state.hintsUsed).toBe(LEVEL.solution.length)
  })
})

describe('getWrongCells', () => {
  it('is empty while the path is a valid solution prefix', () => {
    const state = enter(fresh(), 0, 0)
    expect(getWrongCells(state).size).toBe(0)
  })
})
