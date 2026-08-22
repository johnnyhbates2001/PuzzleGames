import { coordKey, type Coord, type ZipLevelRecord } from '../engine/zip/types'
import { applyCellEntry, isSolved } from '../engine/zip/validator'

export interface ZipGameState {
  level: ZipLevelRecord
  path: Coord[]
  history: Coord[][]
  elapsedMs: number
  runStartedAt: number | null
  status: 'playing' | 'won'
  /** Hints used this level — a nonzero count marks the eventual completion "assisted",
   *  which skips the personal-best update (see recordZipCompletion in storage/db.ts). */
  hintsUsed: number
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
  | { type: 'HINT_REVEAL_NEXT'; now: number }

const MAX_HISTORY = 200

export function createInitialState(level: ZipLevelRecord): ZipGameState {
  return {
    level,
    path: [],
    history: [],
    elapsedMs: 0,
    runStartedAt: null,
    status: 'playing',
    hintsUsed: 0,
  }
}

/** How much of `path` still matches `solution` step-for-step — the path is order-dependent
 *  (a Hamiltonian path, verified unique), so anything past this point is a wrong turn. */
function longestValidPrefixLength(path: Coord[], solution: Coord[]): number {
  let i = 0
  while (i < path.length && i < solution.length && path[i].row === solution[i].row && path[i].col === solution[i].col) {
    i++
  }
  return i
}

/** Non-mutating "check my work": coordKeys of path cells placed after the point the path
 *  stopped matching the solution. */
export function getWrongCells(state: ZipGameState): Set<string> {
  const validLen = longestValidPrefixLength(state.path, state.level.solution)
  const wrong = new Set<string>()
  for (let i = validLen; i < state.path.length; i++) wrong.add(coordKey(state.path[i]))
  return wrong
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

    case 'HINT_REVEAL_NEXT': {
      if (state.status === 'won') return state
      const validLen = longestValidPrefixLength(state.path, state.level.solution)
      if (validLen >= state.level.solution.length) return state
      const path = state.level.solution.slice(0, validLen + 1)
      return withWinCheck({ ...state, path, history: pushHistory(state), hintsUsed: state.hintsUsed + 1 }, action.now)
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
