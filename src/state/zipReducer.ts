import type { Coord, ZipLevelRecord } from '../engine/zip/types'
import { applyCellEntry, isSolved } from '../engine/zip/validator'

export interface ZipGameState {
  level: ZipLevelRecord
  path: Coord[]
  history: Coord[][]
  elapsedMs: number
  runStartedAt: number | null
  status: 'playing' | 'won'
}

export interface PersistedZipSnapshot {
  path: Coord[]
  elapsedMs: number
}

export type ZipAction =
  | { type: 'ENTER_CELL'; row: number; col: number; now: number }
  | { type: 'UNDO' }
  | { type: 'CLEAR'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'LOAD'; level: ZipLevelRecord; snapshot?: PersistedZipSnapshot }

const MAX_HISTORY = 200

export function createInitialState(level: ZipLevelRecord): ZipGameState {
  return {
    level,
    path: [],
    history: [],
    elapsedMs: 0,
    runStartedAt: null,
    status: 'playing',
  }
}

function withWinCheck(state: ZipGameState, now: number): ZipGameState {
  if (!isSolved(state.path, state.level)) return state
  const elapsedMs = state.runStartedAt !== null ? state.elapsedMs + (now - state.runStartedAt) : state.elapsedMs
  return { ...state, status: 'won', elapsedMs, runStartedAt: null }
}

function pushHistory(state: ZipGameState): Coord[][] {
  const next = [...state.history, state.path]
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
}

export function zipReducer(state: ZipGameState, action: ZipAction): ZipGameState {
  switch (action.type) {
    case 'ENTER_CELL': {
      if (state.status === 'won') return state
      const next = applyCellEntry(state.path, state.level, { row: action.row, col: action.col })
      if (next === state.path) return state
      return withWinCheck({ ...state, path: next, history: pushHistory(state) }, action.now)
    }

    case 'UNDO': {
      if (state.status === 'won' || state.history.length === 0) return state
      const path = state.history[state.history.length - 1]
      return { ...state, path, history: state.history.slice(0, -1) }
    }

    case 'CLEAR': {
      if (state.status === 'won' || state.path.length === 0) return state
      // elapsedMs/runStartedAt are intentionally untouched — Clear never resets the timer.
      return { ...state, path: [], history: pushHistory(state) }
    }

    case 'PAUSE': {
      if (state.runStartedAt === null) return state
      return { ...state, elapsedMs: state.elapsedMs + (action.now - state.runStartedAt), runStartedAt: null }
    }

    case 'RESUME': {
      if (state.status === 'won' || state.runStartedAt !== null) return state
      return { ...state, runStartedAt: action.now }
    }

    case 'LOAD': {
      const base = createInitialState(action.level)
      if (!action.snapshot) return base
      return { ...base, path: action.snapshot.path, elapsedMs: action.snapshot.elapsedMs }
    }

    default:
      return state
  }
}
