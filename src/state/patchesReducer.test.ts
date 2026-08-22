import { describe, expect, it } from 'vitest'
import { createInitialState, patchesReducer, type PatchesGameState } from './patchesReducer'
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
  })

  it('refuses to start from a non-clue cell', () => {
    const state = fresh()
    const after = patchesReducer(state, { type: 'START_DRAG', row: 0, col: 1 })
    expect(after).toBe(state)
  })
})

describe('COMMIT_DRAG', () => {
  it('places a rectangle spanning the anchor to the release cell', () => {
    const state = drag(fresh(), [0, 0], [0, 1])
    expect(state.placed).toEqual([{ rect: { row: 0, col: 0, width: 2, height: 1 }, clueIndex: 0 }])
    expect(state.dragAnchor).toBeNull()
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
