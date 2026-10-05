import { cloneGrid, coordKey, EMPTY, MOON, SUN, type Coord, type TangoGrid, type TangoLevelRecord, type TangoValue } from '../engine/tango/types'
import { isSolved } from '../engine/tango/validator'

export interface TangoGameState {
  level: TangoLevelRecord
  grid: TangoGrid
  /** Full-grid snapshot stack for Undo — cheap at 36-64 cells. */
  history: TangoGrid[]
  elapsedMs: number
  runStartedAt: number | null
  status: 'playing' | 'won'
  /** Hints used this level — a nonzero count marks the eventual completion "assisted",
   *  which skips the personal-best update (see finishCompletion in storage/db.ts). */
  hintsUsed: number
}

export interface PersistedTangoSnapshot {
  grid: TangoGrid
  elapsedMs: number
}

export type TangoAction =
  | { type: 'CYCLE_CELL'; row: number; col: number; now: number }
  | { type: 'CLEAR' }
  | { type: 'UNDO' }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'LOAD'; level: TangoLevelRecord; snapshot?: PersistedTangoSnapshot }
  | { type: 'HINT_REVEAL_CELL'; now: number }
  /** A "Show next step" hint (see engine/tango/hints.ts): fills the deduced squares. */
  | { type: 'HINT_PLACE'; cells: Coord[]; value: TangoValue; now: number }
  | { type: 'HINT_SOLVE_ROW'; now: number }
  | { type: 'HINT_CHECK' }

const MAX_HISTORY = 200

/** Tap order matches LinkedIn's Tango: empty → sun → moon → empty. */
const NEXT_VALUE: Record<TangoValue, TangoValue> = { [EMPTY]: SUN, [SUN]: MOON, [MOON]: EMPTY }

export function createInitialState(level: TangoLevelRecord): TangoGameState {
  return {
    level,
    grid: cloneGrid(level.givens),
    history: [],
    elapsedMs: 0,
    runStartedAt: null,
    status: 'playing',
    hintsUsed: 0,
  }
}

export function isGiven(level: TangoLevelRecord, row: number, col: number): boolean {
  return level.givens[row][col] !== EMPTY
}

/** Non-mutating "check my work": coordKeys of filled cells that don't match the solution. */
export function getWrongCells(state: TangoGameState): Set<string> {
  const wrong = new Set<string>()
  state.grid.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v !== EMPTY && v !== state.level.solution[r][c]) wrong.add(coordKey({ row: r, col: c }))
    }),
  )
  return wrong
}

/** First cell (row-major) that's empty or wrong — what a reveal hint fixes. */
function firstWrongOrEmpty(state: TangoGameState): Coord | null {
  for (let r = 0; r < state.grid.length; r++) {
    for (let c = 0; c < state.grid.length; c++) {
      if (state.grid[r][c] !== state.level.solution[r][c]) return { row: r, col: c }
    }
  }
  return null
}

function withWinCheck(state: TangoGameState, now: number): TangoGameState {
  if (!isSolved(state.grid, state.level.edges)) return state
  const elapsedMs = state.runStartedAt !== null ? state.elapsedMs + (now - state.runStartedAt) : state.elapsedMs
  return { ...state, status: 'won', elapsedMs, runStartedAt: null }
}

function pushHistory(state: TangoGameState): TangoGrid[] {
  const next = [...state.history, cloneGrid(state.grid)]
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
}

export function tangoReducer(state: TangoGameState, action: TangoAction): TangoGameState {
  switch (action.type) {
    case 'CYCLE_CELL': {
      if (state.status === 'won' || isGiven(state.level, action.row, action.col)) return state
      const grid = cloneGrid(state.grid)
      grid[action.row][action.col] = NEXT_VALUE[grid[action.row][action.col]]
      return withWinCheck({ ...state, grid, history: pushHistory(state) }, action.now)
    }

    case 'CLEAR': {
      if (state.status === 'won') return state
      // elapsedMs/runStartedAt are intentionally untouched — Clear never resets the timer.
      return { ...state, grid: cloneGrid(state.level.givens), history: pushHistory(state) }
    }

    case 'UNDO': {
      if (state.status === 'won' || state.history.length === 0) return state
      return { ...state, grid: state.history[state.history.length - 1], history: state.history.slice(0, -1) }
    }

    case 'PAUSE': {
      if (state.runStartedAt === null) return state
      return { ...state, elapsedMs: state.elapsedMs + (action.now - state.runStartedAt), runStartedAt: null }
    }

    case 'RESUME': {
      if (state.status === 'won' || state.runStartedAt !== null) return state
      return { ...state, runStartedAt: action.now }
    }

    case 'HINT_REVEAL_CELL': {
      if (state.status === 'won') return state
      const target = firstWrongOrEmpty(state)
      if (!target) return state
      const grid = cloneGrid(state.grid)
      grid[target.row][target.col] = state.level.solution[target.row][target.col]
      return withWinCheck({ ...state, grid, history: pushHistory(state), hintsUsed: state.hintsUsed + 1 }, action.now)
    }

    case 'HINT_PLACE': {
      if (state.status === 'won') return state
      const grid = cloneGrid(state.grid)
      for (const p of action.cells) if (!isGiven(state.level, p.row, p.col)) grid[p.row][p.col] = action.value
      return withWinCheck({ ...state, grid, history: pushHistory(state), hintsUsed: state.hintsUsed + 1 }, action.now)
    }

    case 'HINT_SOLVE_ROW': {
      if (state.status === 'won') return state
      const target = firstWrongOrEmpty(state)
      if (!target) return state
      const grid = cloneGrid(state.grid)
      grid[target.row] = state.level.solution[target.row].slice()
      return withWinCheck({ ...state, grid, history: pushHistory(state), hintsUsed: state.hintsUsed + 1 }, action.now)
    }

    case 'HINT_CHECK': {
      if (state.status === 'won') return state
      return { ...state, hintsUsed: state.hintsUsed + 1 }
    }

    case 'LOAD': {
      const base = createInitialState(action.level)
      if (!action.snapshot) return base
      return { ...base, grid: cloneGrid(action.snapshot.grid), elapsedMs: action.snapshot.elapsedMs }
    }

    default:
      return state
  }
}
