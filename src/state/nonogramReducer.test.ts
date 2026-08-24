import { describe, expect, it } from 'vitest'
import { createInitialState, getWrongCells, nonogramReducer, type NonogramState } from './nonogramReducer'
import { cluesFromSolution, type NonogramLevelRecord } from '../engine/nonogram/types'

// A 2x2 with three filled cells — small enough to walk every reducer path by hand,
// with enough cells that a single click never accidentally completes the puzzle.
const SOLUTION = [
  [true, true],
  [false, true],
]
const { rowClues, colClues } = cluesFromSolution(SOLUTION)
const LEVEL: NonogramLevelRecord = { id: 'test-level', difficulty: 'easy', size: 2, solution: SOLUTION, rowClues, colClues }

function fresh(): NonogramState {
  return createInitialState(LEVEL)
}

describe('createInitialState', () => {
  it('starts every cell empty', () => {
    const state = fresh()
    expect(state.grid).toEqual([
      ['empty', 'empty'],
      ['empty', 'empty'],
    ])
    expect(state.status).toBe('playing')
  })
})

describe('CELL_CLICK', () => {
  it('toggles a cell between empty and the current mode\'s mark (default: fill)', () => {
    let state = fresh()
    expect(state.markMode).toBe('fill')
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    expect(state.grid[1][0]).toBe('filled')
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    expect(state.grid[1][0]).toBe('empty')
  })

  it('toggles between empty and X once in X mode, and overwrites an existing fill', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'TOGGLE_MARK_MODE' })
    expect(state.markMode).toBe('x')
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    expect(state.grid[1][0]).toBe('x')
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    expect(state.grid[1][0]).toBe('empty')

    // A cell already filled gets overwritten to X by a tap in X mode, not cleared.
    state = nonogramReducer(state, { type: 'TOGGLE_MARK_MODE' }) // back to fill
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    expect(state.grid[1][0]).toBe('filled')
    state = nonogramReducer(state, { type: 'TOGGLE_MARK_MODE' }) // to X
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    expect(state.grid[1][0]).toBe('x')
  })

  it('wins the instant the fill pattern matches the solution', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'RESUME', now: 0 })
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 0, now: 0 })
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 1, now: 0 })
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 1, now: 5000 })
    expect(state.status).toBe('won')
    expect(state.elapsedMs).toBe(5000)
    expect(state.runStartedAt).toBeNull()
  })

  it('does not win while a required cell is still unfilled', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 0, now: 0 })
    expect(state.status).toBe('playing')
  })

  it('freezes further input once won', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 0, now: 0 })
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 1, now: 0 })
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 1, now: 0 })
    expect(state.status).toBe('won')

    const afterWin = state
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    expect(state).toBe(afterWin)
  })
})

describe('TOGGLE_MARK_MODE', () => {
  it('flips between fill and x', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'TOGGLE_MARK_MODE' })
    expect(state.markMode).toBe('x')
    state = nonogramReducer(state, { type: 'TOGGLE_MARK_MODE' })
    expect(state.markMode).toBe('fill')
  })

  it('is frozen once won', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 0, now: 0 })
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 1, now: 0 })
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 1, now: 0 })
    expect(state.status).toBe('won')
    const afterWin = state
    state = nonogramReducer(state, { type: 'TOGGLE_MARK_MODE' })
    expect(state).toBe(afterWin)
  })
})

describe('BEGIN_DRAG_MARK / DRAG_MARK_CELL', () => {
  it('drags in fill mode paint every entered cell, one Undo reverting the whole stroke', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'BEGIN_DRAG_MARK' })
    state = nonogramReducer(state, { type: 'DRAG_MARK_CELL', row: 0, col: 0, mode: 'add', now: 0 })
    state = nonogramReducer(state, { type: 'DRAG_MARK_CELL', row: 0, col: 1, mode: 'add', now: 0 })
    expect(state.grid[0]).toEqual(['filled', 'filled'])

    state = nonogramReducer(state, { type: 'UNDO' })
    expect(state.grid[0]).toEqual(['empty', 'empty'])
  })

  it('erase mode clears only cells that already carry the mode\'s mark', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 0, now: 0 }) // filled
    state = nonogramReducer(state, { type: 'BEGIN_DRAG_MARK' })
    state = nonogramReducer(state, { type: 'DRAG_MARK_CELL', row: 0, col: 0, mode: 'erase', now: 0 })
    state = nonogramReducer(state, { type: 'DRAG_MARK_CELL', row: 0, col: 1, mode: 'erase', now: 0 }) // already empty: no-op
    expect(state.grid[0]).toEqual(['empty', 'empty'])
  })

  it('respects the current mark mode — dragging in X mode paints X, not fill', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'TOGGLE_MARK_MODE' })
    state = nonogramReducer(state, { type: 'BEGIN_DRAG_MARK' })
    state = nonogramReducer(state, { type: 'DRAG_MARK_CELL', row: 1, col: 0, mode: 'add', now: 0 })
    expect(state.grid[1][0]).toBe('x')
  })

  it('can win mid-drag once the fill pattern matches the solution', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'RESUME', now: 0 })
    state = nonogramReducer(state, { type: 'BEGIN_DRAG_MARK' })
    state = nonogramReducer(state, { type: 'DRAG_MARK_CELL', row: 0, col: 0, mode: 'add', now: 0 })
    state = nonogramReducer(state, { type: 'DRAG_MARK_CELL', row: 0, col: 1, mode: 'add', now: 0 })
    state = nonogramReducer(state, { type: 'DRAG_MARK_CELL', row: 1, col: 1, mode: 'add', now: 5000 })
    expect(state.status).toBe('won')
    expect(state.elapsedMs).toBe(5000)
  })

  it('is frozen once won', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 0, now: 0 })
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 1, now: 0 })
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 1, now: 0 })
    expect(state.status).toBe('won')
    const afterWin = state
    state = nonogramReducer(state, { type: 'BEGIN_DRAG_MARK' })
    state = nonogramReducer(state, { type: 'DRAG_MARK_CELL', row: 1, col: 0, mode: 'add', now: 0 })
    expect(state).toBe(afterWin)
  })
})

describe('CLEAR / UNDO', () => {
  it('CLEAR resets every cell to empty', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    state = nonogramReducer(state, { type: 'CLEAR', now: 0 })
    expect(state.grid[1][0]).toBe('empty')
  })

  it('UNDO reverts the last click', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    state = nonogramReducer(state, { type: 'UNDO' })
    expect(state.grid[1][0]).toBe('empty')
  })

  it('UNDO is a no-op with no history', () => {
    const state = fresh()
    const undone = nonogramReducer(state, { type: 'UNDO' })
    expect(undone).toBe(state)
  })
})

describe('timer', () => {
  it('PAUSE accumulates elapsed time and RESUME restarts the running interval', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'RESUME', now: 0 })
    state = nonogramReducer(state, { type: 'PAUSE', now: 1000 })
    expect(state.elapsedMs).toBe(1000)
    expect(state.runStartedAt).toBeNull()
  })
})

describe('LOAD', () => {
  it('hydrates a fresh grid for a level with no snapshot', () => {
    const state = nonogramReducer(fresh(), { type: 'LOAD', level: LEVEL })
    expect(state.grid[0][0]).toBe('empty')
    expect(state.elapsedMs).toBe(0)
  })

  it('restores grid and elapsedMs from a persisted snapshot', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    const snapshot = { grid: state.grid, elapsedMs: 4242 }

    const loaded = nonogramReducer(fresh(), { type: 'LOAD', level: LEVEL, snapshot })
    expect(loaded.grid[1][0]).toBe('filled')
    expect(loaded.elapsedMs).toBe(4242)
  })
})

describe('HINT_REVEAL_CELL', () => {
  it('reveals the correct mark for the first wrong cell and increments hintsUsed', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 0, now: 0 }) // correct
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 1, now: 0 }) // correct
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 1, col: 0, now: 0 }) // wrong: should stay empty
    state = nonogramReducer(state, { type: 'HINT_REVEAL_CELL', now: 0 })
    expect(state.hintsUsed).toBe(1)
    expect(state.grid[1][0]).toBe('x')
  })

  it('wins once the last wrong cell is revealed', () => {
    let state = fresh()
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 0, now: 0 })
    state = nonogramReducer(state, { type: 'CELL_CLICK', row: 0, col: 1, now: 0 })
    state = nonogramReducer(state, { type: 'HINT_REVEAL_CELL', now: 0 }) // only (1,1) left wrong
    expect(state.status).toBe('won')
  })
})

describe('HINT_REVEAL_LINE', () => {
  it('fills an entire incomplete row/column to match the solution', () => {
    const state = nonogramReducer(fresh(), { type: 'HINT_REVEAL_LINE', now: 0 })
    expect(state.hintsUsed).toBe(1)
    expect(state.grid[0]).toEqual(['filled', 'filled'])
  })
})

describe('getWrongCells', () => {
  it('flags a filled cell that should be empty', () => {
    const state = nonogramReducer(fresh(), { type: 'CELL_CLICK', row: 1, col: 0, now: 0 })
    expect(getWrongCells(state)).toEqual(new Set(['1,0']))
  })

  it('is empty on a freshly loaded grid', () => {
    expect(getWrongCells(fresh()).size).toBe(0)
  })
})
