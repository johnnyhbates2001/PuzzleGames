import { describe, expect, it } from 'vitest'
import { createInitialState, getWrongCells, sudokuReducer, type SudokuGameState } from './sudokuReducer'
import type { SudokuLevelRecord } from '../engine/sudoku/types'

// A minimal 1-cell-missing 9x9 puzzle so a single INPUT_DIGIT completes the solve —
// solution reused from the generator test fixture (verified elsewhere).
const SOLUTION = [
  [8, 7, 6, 9, 5, 1, 3, 2, 4],
  [3, 2, 5, 6, 8, 4, 7, 9, 1],
  [4, 9, 1, 2, 3, 7, 5, 8, 6],
  [5, 3, 4, 7, 1, 2, 8, 6, 9],
  [2, 1, 7, 8, 6, 9, 4, 5, 3],
  [6, 8, 9, 3, 4, 5, 1, 7, 2],
  [9, 5, 3, 4, 2, 8, 6, 1, 7],
  [1, 4, 2, 5, 7, 6, 9, 3, 8],
  [7, 6, 8, 1, 9, 3, 2, 4, 5],
]

function puzzleMissing(row: number, col: number): number[][] {
  return SOLUTION.map((r, ri) => r.map((v, ci) => (ri === row && ci === col ? 0 : v)))
}

const LEVEL: SudokuLevelRecord = {
  id: 'test-level',
  difficulty: 'easy',
  puzzle: puzzleMissing(0, 0),
  solution: SOLUTION,
}

function fresh(): SudokuGameState {
  return createInitialState(LEVEL)
}

describe('createInitialState', () => {
  it('marks non-zero puzzle cells as given and zero cells as empty/editable', () => {
    const state = fresh()
    expect(state.board[0][0]).toEqual({ value: 0, given: false, notes: new Set() })
    expect(state.board[0][1]).toEqual({ value: SOLUTION[0][1], given: true, notes: new Set() })
    expect(state.noteMode).toBe(false)
  })
})

describe('SELECT_CELL / INPUT_DIGIT / ERASE', () => {
  it('fills the selected cell with the chosen digit', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 5, now: 0 })
    expect(state.board[0][0].value).toBe(5)
  })

  it('refuses to overwrite a given cell', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 1 }) // given cell
    const before = state
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 9, now: 0 })
    expect(state).toBe(before)
    expect(state.board[0][1].given).toBe(true)
  })

  it('is a no-op with nothing selected', () => {
    const state = fresh()
    const after = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 5, now: 0 })
    expect(after).toBe(state)
  })

  it('ERASE clears a filled editable cell but leaves givens untouched', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 5, now: 0 })
    state = sudokuReducer(state, { type: 'ERASE', now: 0 })
    expect(state.board[0][0].value).toBe(0)

    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 1 })
    const before = state
    state = sudokuReducer(state, { type: 'ERASE', now: 0 })
    expect(state).toBe(before)
  })
})

describe('CLEAR', () => {
  it('resets every non-given cell but keeps givens', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 5, now: 0 })
    state = sudokuReducer(state, { type: 'CLEAR', now: 0 })
    expect(state.board[0][0].value).toBe(0)
    expect(state.board[0][1]).toEqual({ value: SOLUTION[0][1], given: true, notes: new Set() })
  })
})

describe('note mode', () => {
  it('TOGGLE_NOTE_MODE flips noteMode', () => {
    let state = fresh()
    expect(state.noteMode).toBe(false)
    state = sudokuReducer(state, { type: 'TOGGLE_NOTE_MODE' })
    expect(state.noteMode).toBe(true)
  })

  it('INPUT_DIGIT toggles a pencil mark on and off instead of setting the value', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'TOGGLE_NOTE_MODE' })
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 3, now: 0 })
    expect(state.board[0][0].value).toBe(0)
    expect(state.board[0][0].notes.has(3)).toBe(true)

    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 3, now: 0 }) // toggle off
    expect(state.board[0][0].notes.has(3)).toBe(false)
  })

  it('refuses to add notes to a cell that already has a value', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 5, now: 0 })
    state = sudokuReducer(state, { type: 'TOGGLE_NOTE_MODE' })
    const before = state
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 3, now: 0 })
    expect(state).toBe(before)
  })

  it('filling a cell with a real digit clears any pencil marks it had', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'TOGGLE_NOTE_MODE' })
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 3, now: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 7, now: 0 })
    expect(state.board[0][0].notes.size).toBe(2)

    state = sudokuReducer(state, { type: 'TOGGLE_NOTE_MODE' })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 5, now: 0 })
    expect(state.board[0][0].value).toBe(5)
    expect(state.board[0][0].notes.size).toBe(0)
  })

  it('ERASE clears pencil marks from an empty noted cell', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'TOGGLE_NOTE_MODE' })
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 3, now: 0 })
    state = sudokuReducer(state, { type: 'ERASE', now: 0 })
    expect(state.board[0][0].notes.size).toBe(0)
  })
})

describe('undo', () => {
  it('reverts the last digit entry', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 5, now: 0 })
    state = sudokuReducer(state, { type: 'UNDO' })
    expect(state.board[0][0].value).toBe(0)
  })

  it('is a no-op when there is no history', () => {
    const state = fresh()
    const undone = sudokuReducer(state, { type: 'UNDO' })
    expect(undone).toBe(state)
  })
})

describe('timer', () => {
  it('PAUSE accumulates elapsed time and RESUME restarts the running interval', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'RESUME', now: 0 })
    state = sudokuReducer(state, { type: 'PAUSE', now: 1000 })
    expect(state.elapsedMs).toBe(1000)
    expect(state.runStartedAt).toBeNull()
  })
})

describe('win detection', () => {
  it('transitions to won the instant the final correct digit is placed', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'RESUME', now: 0 })
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: SOLUTION[0][0], now: 5000 })

    expect(state.status).toBe('won')
    expect(state.runStartedAt).toBeNull()
    expect(state.elapsedMs).toBe(5000)
  })

  it('does not win on an incorrect final digit', () => {
    let state = fresh()
    const wrongDigit = SOLUTION[0][0] === 1 ? 2 : 1
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: wrongDigit, now: 0 })
    expect(state.status).toBe('playing')
  })

  it('freezes further input once won', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: SOLUTION[0][0], now: 0 })
    expect(state.status).toBe('won')

    const afterWin = state
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 1, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 1, now: 0 })
    expect(state).toBe(afterWin)
  })
})

describe('LOAD', () => {
  it('hydrates a fresh board for a level with no snapshot', () => {
    const state = sudokuReducer(fresh(), { type: 'LOAD', level: LEVEL })
    expect(state.board[0][0].value).toBe(0)
    expect(state.elapsedMs).toBe(0)
    expect(state.status).toBe('playing')
  })

  it('restores board and elapsedMs from a persisted snapshot', () => {
    let state = fresh()
    state = sudokuReducer(state, { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: 5, now: 0 })
    const snapshot = { board: state.board, elapsedMs: 4242 }

    const loaded = sudokuReducer(fresh(), { type: 'LOAD', level: LEVEL, snapshot })
    expect(loaded.board[0][0].value).toBe(5)
    expect(loaded.elapsedMs).toBe(4242)
  })
})

describe('HINT_REVEAL_CELL', () => {
  it('fills the wrong/empty cell with the solution value and increments hintsUsed', () => {
    const state = sudokuReducer(fresh(), { type: 'HINT_REVEAL_CELL', now: 0 })
    expect(state.hintsUsed).toBe(1)
    expect(state.board[0][0].value).toBe(SOLUTION[0][0])
  })

  it('corrects a wrong value already entered, not just an empty cell', () => {
    let state = sudokuReducer(fresh(), { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: (SOLUTION[0][0] % 9) + 1, now: 0 }) // deliberately wrong
    state = sudokuReducer(state, { type: 'HINT_REVEAL_CELL', now: 0 })
    expect(state.board[0][0].value).toBe(SOLUTION[0][0])
  })

  it('wins once the only missing cell is revealed', () => {
    const state = sudokuReducer(fresh(), { type: 'HINT_REVEAL_CELL', now: 0 })
    expect(state.status).toBe('won')
  })
})

describe('HINT_SOLVE_BOX', () => {
  it('fills every incomplete non-given cell in one box', () => {
    const state = sudokuReducer(fresh(), { type: 'HINT_SOLVE_BOX', now: 0 })
    expect(state.hintsUsed).toBe(1)
    expect(state.board[0][0].value).toBe(SOLUTION[0][0])
  })
})

describe('getWrongCells', () => {
  it('flags an entered value that does not match the solution', () => {
    let state = sudokuReducer(fresh(), { type: 'SELECT_CELL', row: 0, col: 0 })
    state = sudokuReducer(state, { type: 'INPUT_DIGIT', digit: (SOLUTION[0][0] % 9) + 1, now: 0 })
    expect(getWrongCells(state)).toEqual(new Set(['0,0']))
  })

  it('is empty on a freshly loaded board', () => {
    expect(getWrongCells(fresh()).size).toBe(0)
  })
})
