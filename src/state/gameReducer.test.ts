import { describe, expect, it } from 'vitest'
import { createInitialState, gameReducer, getWrongQueens, type GameState } from './gameReducer'
import type { LevelRecord } from '../engine/types'

// Same 4x4 fixture used in the engine tests: unique solution (0,1) (1,3) (2,0) (3,2).
const LEVEL: LevelRecord = {
  id: 'test-level',
  difficulty: 'easy',
  size: 4,
  regions: [
    [0, 0, 1, 1],
    [2, 0, 0, 1],
    [2, 2, 3, 1],
    [2, 3, 3, 3],
  ],
  solution: [
    { row: 0, col: 1 },
    { row: 1, col: 3 },
    { row: 2, col: 0 },
    { row: 3, col: 2 },
  ],
}

function fresh(autoPlaceX = true): GameState {
  return createInitialState(LEVEL, autoPlaceX)
}

function click(state: GameState, row: number, col: number, now = 0): GameState {
  return gameReducer(state, { type: 'CELL_CLICK', row, col, now })
}

describe('three-state click cycle', () => {
  it('cycles empty -> manual X -> queen -> empty', () => {
    let state = fresh()
    expect(state.board[1][1]).toMatchObject({ queen: false, manualX: false })

    state = click(state, 1, 1)
    expect(state.board[1][1].manualX).toBe(true)
    expect(state.board[1][1].queen).toBe(false)

    state = click(state, 1, 1)
    expect(state.board[1][1].queen).toBe(true)
    expect(state.board[1][1].manualX).toBe(false)

    state = click(state, 1, 1)
    expect(state.board[1][1].queen).toBe(false)
    expect(state.board[1][1].manualX).toBe(false)
    expect(state.board[1][1].autoXSources.size).toBe(0)
  })
})

describe('auto-X source tracking', () => {
  it('tags affected cells with the placing queen id, and untags only that queen on removal', () => {
    let state = fresh(true)
    // (0,0) and (3,3) don't share a row/col/region and aren't adjacent to each other
    // (so each click cycle stays clean), but both cover (3,0) — (0,0) via its column,
    // (3,3) via its row — giving a genuine two-source overlap to test.
    state = click(state, 0, 0) // X
    state = click(state, 0, 0) // queen
    state = click(state, 3, 3) // X
    state = click(state, 3, 3) // queen

    const shared = state.board[3][0]
    expect(shared.queen).toBe(false)
    expect(shared.autoXSources.size).toBe(2)
    expect(shared.autoXSources.has('0,0')).toBe(true)
    expect(shared.autoXSources.has('3,3')).toBe(true)

    // remove queen at (0,0): only its contribution disappears
    state = click(state, 0, 0) // -> empty
    expect(state.board[3][0].autoXSources.size).toBe(1)
    expect(state.board[3][0].autoXSources.has('3,3')).toBe(true)
    expect(state.board[3][0].autoXSources.has('0,0')).toBe(false)

    // remove queen at (3,3) too: shared cell now fully clear
    state = click(state, 3, 3)
    expect(state.board[3][0].autoXSources.size).toBe(0)
  })

  it('preserves a manually-placed X when the covering queen is removed', () => {
    let state = fresh(true)
    state = click(state, 1, 2) // manual X at (1,2)
    expect(state.board[1][2].manualX).toBe(true)

    state = click(state, 1, 1) // X
    state = click(state, 1, 1) // queen at (1,1) -> auto-X's (1,2) via row1
    expect(state.board[1][2].autoXSources.has('1,1')).toBe(true)
    expect(state.board[1][2].manualX).toBe(true)

    state = click(state, 1, 1) // remove queen
    expect(state.board[1][2].autoXSources.size).toBe(0)
    expect(state.board[1][2].manualX).toBe(true) // manual X survives
  })

  it('does not auto-X when autoPlaceX is disabled', () => {
    let state = fresh(false)
    state = click(state, 1, 1)
    state = click(state, 1, 1) // queen, autoPlaceX off
    expect(state.board[1][2].autoXSources.size).toBe(0)
  })

  it('SET_AUTO_X: toggling on applies auto-X for existing queens; toggling off clears auto-X but keeps manual X and queens', () => {
    let state = fresh(false)
    state = click(state, 1, 1)
    state = click(state, 1, 1) // queen, no auto-X yet
    state = click(state, 0, 0) // manual X elsewhere
    expect(state.board[1][2].autoXSources.size).toBe(0)

    state = gameReducer(state, { type: 'SET_AUTO_X', enabled: true })
    expect(state.board[1][2].autoXSources.has('1,1')).toBe(true)
    expect(state.board[0][0].manualX).toBe(true)
    expect(state.board[1][1].queen).toBe(true)

    state = gameReducer(state, { type: 'SET_AUTO_X', enabled: false })
    expect(state.board[1][2].autoXSources.size).toBe(0)
    expect(state.board[0][0].manualX).toBe(true) // manual X preserved
    expect(state.board[1][1].queen).toBe(true) // queen preserved
  })
})

describe('undo', () => {
  it('reverts the last placement, one step at a time', () => {
    let state = fresh()
    state = click(state, 0, 0) // manual X
    const afterFirstClick = state
    state = click(state, 0, 0) // queen

    state = gameReducer(state, { type: 'UNDO' })
    expect(state.board).toEqual(afterFirstClick.board)

    state = gameReducer(state, { type: 'UNDO' })
    expect(state.board[0][0]).toMatchObject({ queen: false, manualX: false })
  })

  it('is a no-op when there is no history', () => {
    const state = fresh()
    const undone = gameReducer(state, { type: 'UNDO' })
    expect(undone).toBe(state)
  })

  it('can undo a CLEAR', () => {
    let state = fresh()
    state = click(state, 0, 0)
    state = click(state, 0, 0) // queen at (0,0)
    const beforeClear = state
    state = gameReducer(state, { type: 'CLEAR', now: 0 })
    expect(state.board[0][0].queen).toBe(false)

    state = gameReducer(state, { type: 'UNDO' })
    expect(state.board).toEqual(beforeClear.board)
  })
})

describe('timer', () => {
  it('CLEAR does not reset elapsedMs', () => {
    let state = fresh()
    state = gameReducer(state, { type: 'RESUME', now: 1000 })
    state = gameReducer(state, { type: 'PAUSE', now: 5000 }) // 4000ms elapsed
    expect(state.elapsedMs).toBe(4000)

    state = gameReducer(state, { type: 'CLEAR', now: 9000 })
    expect(state.elapsedMs).toBe(4000)
  })

  it('PAUSE accumulates elapsed time and RESUME restarts the running interval', () => {
    let state = fresh()
    state = gameReducer(state, { type: 'RESUME', now: 0 })
    state = gameReducer(state, { type: 'PAUSE', now: 1000 })
    expect(state.elapsedMs).toBe(1000)
    expect(state.runStartedAt).toBeNull()

    state = gameReducer(state, { type: 'RESUME', now: 2000 })
    state = gameReducer(state, { type: 'PAUSE', now: 2500 })
    expect(state.elapsedMs).toBe(1500)
  })
})

describe('win detection', () => {
  it('transitions to won and stops the timer the instant the full solution is placed', () => {
    let state = fresh(false)
    state = gameReducer(state, { type: 'RESUME', now: 0 })

    for (const q of LEVEL.solution.slice(0, -1)) {
      state = click(state, q.row, q.col, 100)
      state = click(state, q.row, q.col, 100) // X -> queen
    }
    expect(state.status).toBe('playing')

    const last = LEVEL.solution[LEVEL.solution.length - 1]
    state = click(state, last.row, last.col, 200)
    state = click(state, last.row, last.col, 5000) // final queen placement, now=5000

    expect(state.status).toBe('won')
    expect(state.runStartedAt).toBeNull()
    expect(state.elapsedMs).toBe(5000)
  })

  it('freezes further CELL_CLICK and UNDO actions once won', () => {
    let state = fresh(false)
    for (const q of LEVEL.solution) {
      state = click(state, q.row, q.col, 0)
      state = click(state, q.row, q.col, 0)
    }
    expect(state.status).toBe('won')

    const afterWin = state
    state = click(state, 0, 0, 0)
    expect(state).toBe(afterWin)

    state = gameReducer(state, { type: 'UNDO' })
    expect(state).toBe(afterWin)
  })
})

describe('drag mark', () => {
  function drag(state: GameState, cells: Array<[number, number]>, mode: 'add' | 'erase'): GameState {
    state = gameReducer(state, { type: 'BEGIN_DRAG_MARK' })
    for (const [row, col] of cells) {
      state = gameReducer(state, { type: 'DRAG_MARK_CELL', row, col, mode })
    }
    return state
  }

  it('add mode paints X across every cell in the stroke, undone in one step', () => {
    let state = fresh()
    const before = state
    state = drag(state, [
      [0, 0],
      [0, 2],
      [1, 1],
    ], 'add')

    expect(state.board[0][0].manualX).toBe(true)
    expect(state.board[0][2].manualX).toBe(true)
    expect(state.board[1][1].manualX).toBe(true)

    state = gameReducer(state, { type: 'UNDO' })
    expect(state.board).toEqual(before.board)
  })

  it('add mode skips queen cells', () => {
    let state = fresh()
    state = click(state, 2, 2) // X
    state = click(state, 2, 2) // queen at (2,2)
    const beforeDrag = state

    state = drag(state, [[2, 2]], 'add')
    expect(state.board[2][2]).toEqual(beforeDrag.board[2][2])
  })

  it('erase mode clears manual and auto X so the cell visibly stops showing X', () => {
    let state = fresh(true)
    state = click(state, 1, 1) // X
    state = click(state, 1, 1) // queen at (1,1) -> auto-X's (1,2) via row 1
    state = click(state, 3, 0) // manual X at (3,0)
    expect(state.board[1][2].autoXSources.size).toBeGreaterThan(0)
    expect(state.board[3][0].manualX).toBe(true)

    state = drag(state, [
      [1, 2],
      [3, 0],
    ], 'erase')

    expect(state.board[1][2].manualX).toBe(false)
    expect(state.board[1][2].autoXSources.size).toBe(0)
    expect(state.board[3][0].manualX).toBe(false)
  })

  it('is idempotent when a stroke re-crosses an already-painted cell', () => {
    let state = fresh()
    state = drag(state, [[0, 0]], 'add')
    const afterFirst = state
    state = gameReducer(state, { type: 'DRAG_MARK_CELL', row: 0, col: 0, mode: 'add' })
    expect(state).toBe(afterFirst) // same reference: reducer bailed out on the no-op
  })
})

describe('LOAD', () => {
  it('hydrates a fresh board for a level with no snapshot', () => {
    const state = gameReducer(fresh(), { type: 'LOAD', level: LEVEL, autoPlaceX: true })
    expect(state.board[0][0]).toMatchObject({ queen: false, manualX: false })
    expect(state.elapsedMs).toBe(0)
    expect(state.status).toBe('playing')
  })

  it('restores board and elapsedMs from a persisted snapshot', () => {
    let state = fresh()
    state = click(state, 0, 0)
    const snapshot = { board: state.board, elapsedMs: 4242 }

    const loaded = gameReducer(fresh(), { type: 'LOAD', level: LEVEL, autoPlaceX: true, snapshot })
    expect(loaded.board[0][0].manualX).toBe(true)
    expect(loaded.elapsedMs).toBe(4242)
  })
})

describe('HINT_REVEAL_CELL', () => {
  it('places one correct queen and increments hintsUsed', () => {
    const state = gameReducer(fresh(), { type: 'HINT_REVEAL_CELL', now: 0 })
    expect(state.hintsUsed).toBe(1)
    const placed = LEVEL.solution.filter((c) => state.board[c.row][c.col].queen)
    expect(placed).toHaveLength(1)
  })

  it('replaces a wrong queen already in that row rather than adding a second one', () => {
    let state = click(click(fresh(), 0, 0), 0, 0) // two clicks: empty -> X -> queen (wrong; solution wants col 1)
    state = gameReducer(state, { type: 'HINT_REVEAL_CELL', now: 0 })
    expect(state.board[0][0].queen).toBe(false)
    expect(state.board[0][1].queen).toBe(true)
  })

  it('wins the game once every row is revealed', () => {
    let state = fresh()
    for (let i = 0; i < LEVEL.solution.length; i++) {
      state = gameReducer(state, { type: 'HINT_REVEAL_CELL', now: 0 })
    }
    expect(state.status).toBe('won')
    expect(state.hintsUsed).toBe(4)
  })

  it('is a no-op once the board is already solved', () => {
    let state = fresh()
    for (let i = 0; i < LEVEL.solution.length; i++) {
      state = gameReducer(state, { type: 'HINT_REVEAL_CELL', now: 0 })
    }
    const after = gameReducer(state, { type: 'HINT_REVEAL_CELL', now: 0 })
    expect(after).toBe(state)
  })
})

describe('HINT_SOLVE_REGION', () => {
  it('places every solution queen for one still-incomplete region', () => {
    const state = gameReducer(fresh(), { type: 'HINT_SOLVE_REGION', now: 0 })
    expect(state.hintsUsed).toBe(1)
    const placed = LEVEL.solution.filter((c) => state.board[c.row][c.col].queen)
    expect(placed).toHaveLength(1) // this fixture's regions are 1 queen each
  })
})

describe('getWrongQueens', () => {
  it('flags a queen placed off the solution', () => {
    const state = click(click(fresh(), 0, 0), 0, 0) // two clicks: empty -> X -> queen; solution wants (0,1)
    expect(getWrongQueens(state)).toEqual(new Set(['0,0']))
  })

  it('is empty once every placed queen matches the solution', () => {
    let state = fresh()
    for (let i = 0; i < LEVEL.solution.length; i++) {
      state = gameReducer(state, { type: 'HINT_REVEAL_CELL', now: 0 })
    }
    expect(getWrongQueens(state).size).toBe(0)
  })
})
