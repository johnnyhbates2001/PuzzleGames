import { describe, expect, it } from 'vitest'
import { createInitialState, getWrongCells, patchesReducer, type PatchesGameState } from './patchesReducer'
import type { PatchesLevelRecord } from '../engine/patches/types'

// Same 2x2 two-wide-dominoes puzzle used throughout engine/patches tests.
const LEVEL: PatchesLevelRecord = {
  id: 'test-level',
  difficulty: 'easy',
  size: 2,
  clues: [
    { cell: { row: 0, col: 0 }, area: 2, shape: 'wide' },
    { cell: { row: 1, col: 0 }, area: 2, shape: 'wide' },
  ],
  solution: [
    { row: 0, col: 0, width: 2, height: 1 },
    { row: 1, col: 0, width: 2, height: 1 },
  ],
}

function fresh(): PatchesGameState {
  return createInitialState(LEVEL)
}

function drag(state: PatchesGameState, from: [number, number], to: [number, number], now = 0): PatchesGameState {
  state = patchesReducer(state, { type: 'START_DRAG', row: from[0], col: from[1] })
  return patchesReducer(state, { type: 'COMMIT_DRAG', row: to[0], col: to[1], now })
}

describe('START_DRAG', () => {
  it('only starts from an uncovered clue cell', () => {
    const state = fresh()
    const started = patchesReducer(state, { type: 'START_DRAG', row: 0, col: 0 })
    expect(started.dragAnchor).toEqual({ row: 0, col: 0 })
    // dragEnd starts at the anchor itself — a 1-cell preview the instant the drag begins.
    expect(started.dragEnd).toEqual({ row: 0, col: 0 })
  })

  it('refuses to start from a non-clue cell', () => {
    const state = fresh()
    const after = patchesReducer(state, { type: 'START_DRAG', row: 0, col: 1 })
    expect(after).toBe(state)
  })
})

describe('DRAG_MOVE', () => {
  it('updates dragEnd while a drag is in progress, for the live preview', () => {
    let state = patchesReducer(fresh(), { type: 'START_DRAG', row: 0, col: 0 })
    state = patchesReducer(state, { type: 'DRAG_MOVE', row: 0, col: 1 })
    expect(state.dragEnd).toEqual({ row: 0, col: 1 })
    expect(state.dragAnchor).toEqual({ row: 0, col: 0 }) // anchor is untouched
  })

  it('is a no-op with no drag in progress', () => {
    const state = fresh()
    const after = patchesReducer(state, { type: 'DRAG_MOVE', row: 0, col: 1 })
    expect(after).toBe(state)
  })
})

describe('CANCEL_DRAG', () => {
  it('clears both dragAnchor and dragEnd without placing anything', () => {
    let state = patchesReducer(fresh(), { type: 'START_DRAG', row: 0, col: 0 })
    state = patchesReducer(state, { type: 'DRAG_MOVE', row: 0, col: 1 })
    state = patchesReducer(state, { type: 'CANCEL_DRAG' })
    expect(state.dragAnchor).toBeNull()
    expect(state.dragEnd).toBeNull()
    expect(state.placed).toEqual([])
  })
})

describe('COMMIT_DRAG', () => {
  it('places a rectangle spanning the anchor to the release cell', () => {
    const state = drag(fresh(), [0, 0], [0, 1])
    expect(state.placed).toEqual([
      { rect: { row: 0, col: 0, width: 2, height: 1 }, clueIndex: 0, anchor: { row: 0, col: 0 } },
    ])
    expect(state.dragAnchor).toBeNull()
    expect(state.dragEnd).toBeNull()
  })

  it('rejects a commit that would overlap an already-placed rectangle', () => {
    let state = drag(fresh(), [0, 0], [0, 1]) // covers row 0 entirely
    state = patchesReducer(state, { type: 'START_DRAG', row: 1, col: 0 })
    // drag from (1,0) up into row 0 — overlaps the first rectangle
    state = patchesReducer(state, { type: 'COMMIT_DRAG', row: 0, col: 0, now: 0 })
    expect(state.placed.length).toBe(1) // the bad commit was dropped, not added
  })

  it('detects the win the instant every clue has a correct, non-overlapping rectangle', () => {
    let state = drag(fresh(), [0, 0], [0, 1])
    expect(state.status).toBe('playing')
    state = drag(state, [1, 0], [1, 1], 5000)
    expect(state.status).toBe('won')
    expect(state.runStartedAt).toBeNull()
  })
})

describe('REMOVE_RECT', () => {
  it('removes the rectangle covering the tapped cell', () => {
    let state = drag(fresh(), [0, 0], [0, 1])
    state = patchesReducer(state, { type: 'REMOVE_RECT', row: 0, col: 1 })
    expect(state.placed).toEqual([])
  })

  it('is a no-op on an uncovered cell', () => {
    const state = fresh()
    const after = patchesReducer(state, { type: 'REMOVE_RECT', row: 0, col: 0 })
    expect(after).toBe(state)
  })
})

describe('UNDO / CLEAR', () => {
  it('UNDO pops the most recently placed rectangle', () => {
    let state = drag(fresh(), [0, 0], [0, 1])
    state = patchesReducer(state, { type: 'UNDO' })
    expect(state.placed).toEqual([])
  })

  it('CLEAR empties every placed rectangle', () => {
    let state = drag(fresh(), [0, 0], [0, 1])
    state = patchesReducer(state, { type: 'CLEAR' })
    expect(state.placed).toEqual([])
  })
})

describe('timer', () => {
  it('PAUSE accumulates elapsed time and RESUME restarts the running interval', () => {
    let state = fresh()
    state = patchesReducer(state, { type: 'RESUME', now: 0 })
    state = patchesReducer(state, { type: 'PAUSE', now: 1000 })
    expect(state.elapsedMs).toBe(1000)
    expect(state.runStartedAt).toBeNull()
  })
})

describe('LOAD', () => {
  it('hydrates a fresh, empty board for a level with no snapshot', () => {
    const state = patchesReducer(fresh(), { type: 'LOAD', level: LEVEL })
    expect(state.placed).toEqual([])
    expect(state.status).toBe('playing')
  })

  it('restores placed rectangles and elapsedMs from a persisted snapshot', () => {
    const state = drag(fresh(), [0, 0], [0, 1])
    const snapshot = { placed: state.placed, elapsedMs: 4242 }

    const loaded = patchesReducer(fresh(), { type: 'LOAD', level: LEVEL, snapshot })
    expect(loaded.placed).toEqual(state.placed)
    expect(loaded.elapsedMs).toBe(4242)
  })
})

describe('HINT_REVEAL_CLUE', () => {
  it("places the first unplaced clue's solution rectangle and increments hintsUsed", () => {
    const state = patchesReducer(fresh(), { type: 'HINT_REVEAL_CLUE', now: 0 })
    expect(state.hintsUsed).toBe(1)
    expect(state.placed).toEqual([{ rect: LEVEL.solution[0], clueIndex: 0, anchor: LEVEL.clues[0].cell }])
  })

  it('skips clues that are already placed', () => {
    let state = drag(fresh(), [0, 0], [0, 1]) // clue 0 already placed
    state = patchesReducer(state, { type: 'HINT_REVEAL_CLUE', now: 0 })
    expect(state.placed).toEqual([
      { rect: { row: 0, col: 0, width: 2, height: 1 }, clueIndex: 0, anchor: { row: 0, col: 0 } },
      { rect: LEVEL.solution[1], clueIndex: 1, anchor: LEVEL.clues[1].cell },
    ])
  })

  it('wins once every clue is revealed', () => {
    let state = fresh()
    for (let i = 0; i < LEVEL.clues.length; i++) {
      state = patchesReducer(state, { type: 'HINT_REVEAL_CLUE', now: 0 })
    }
    expect(state.status).toBe('won')
    expect(state.hintsUsed).toBe(LEVEL.clues.length)
  })
})

describe('getWrongCells', () => {
  it('is empty once revealed by hint, since revealed rects always match their clue', () => {
    const state = patchesReducer(fresh(), { type: 'HINT_REVEAL_CLUE', now: 0 })
    expect(getWrongCells(state).size).toBe(0)
  })
})
