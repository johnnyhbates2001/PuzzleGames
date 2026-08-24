import type { Coord, NonogramLevelRecord } from '../engine/nonogram/types'
import { coordKey } from '../engine/nonogram/types'
import { isSolved, wrongCells, type Mark } from '../engine/nonogram/validator'

/** Which mark a tap/drag currently applies — swapped via a toolbar button (see
 *  TOGGLE_MARK_MODE) rather than by cycling through both marks on every tap. */
export type MarkMode = 'fill' | 'x'

export interface NonogramState {
  level: NonogramLevelRecord
  grid: Mark[][]
  markMode: MarkMode
  /** Full-grid snapshot stack for Undo — cheap at these grid sizes (<=100 cells). */
  history: Mark[][][]
  elapsedMs: number
  runStartedAt: number | null
  status: 'playing' | 'won'
  /** Hints used this level — a nonzero count marks the eventual completion "assisted",
   *  which skips the personal-best update (see recordNonogramCompletion in storage/db.ts). */
  hintsUsed: number
}

export interface PersistedNonogramSnapshot {
  grid: Mark[][]
  elapsedMs: number
}

export type NonogramAction =
  | { type: 'CELL_CLICK'; row: number; col: number; now: number }
  | { type: 'TOGGLE_MARK_MODE' }
  | { type: 'BEGIN_DRAG_MARK' }
  | { type: 'DRAG_MARK_CELL'; row: number; col: number; mode: 'add' | 'erase'; now: number }
  | { type: 'CLEAR'; now: number }
  | { type: 'UNDO' }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'LOAD'; level: NonogramLevelRecord; snapshot?: PersistedNonogramSnapshot }
  | { type: 'HINT_REVEAL_CELL'; now: number }
  | { type: 'HINT_REVEAL_LINE'; now: number }
  | { type: 'HINT_CHECK' }

const MAX_HISTORY = 200

function emptyGrid(size: number): Mark[][] {
  return Array.from({ length: size }, () => new Array<Mark>(size).fill('empty'))
}

function cloneGrid(grid: Mark[][]): Mark[][] {
  return grid.map((row) => row.slice())
}

/** The mark a tap/drag in the current mode targets — 'x' never appears here since it's
 *  reached only via the mode toggle, not by cycling past 'filled' the way it used to. */
function targetMark(mode: MarkMode): Mark {
  return mode === 'fill' ? 'filled' : 'x'
}

export function createInitialState(level: NonogramLevelRecord): NonogramState {
  return {
    level,
    grid: emptyGrid(level.size),
    markMode: 'fill',
    history: [],
    elapsedMs: 0,
    runStartedAt: null,
    status: 'playing',
    hintsUsed: 0,
  }
}

/** Non-mutating "check my work": coordKeys of marks that disagree with the solution. */
export function getWrongCells(state: NonogramState): Set<string> {
  return new Set(wrongCells(state.level.size, state.level.solution, state.grid).map(coordKey))
}

function withWinCheck(state: NonogramState, now: number): NonogramState {
  if (!isSolved(state.level.size, state.level.solution, state.grid)) return state
  const elapsedMs = state.runStartedAt !== null ? state.elapsedMs + (now - state.runStartedAt) : state.elapsedMs
  return { ...state, status: 'won', elapsedMs, runStartedAt: null }
}

function pushHistory(state: NonogramState): Mark[][][] {
  const next = [...state.history, cloneGrid(state.grid)]
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
}

/** First cell (in raster order) whose mark doesn't yet match the solution. */
function firstWrongCell(state: NonogramState): Coord | null {
  const { size, solution } = state.level
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((state.grid[r][c] === 'filled') !== solution[r][c]) return { row: r, col: c }
    }
  }
  return null
}

/** Sets a cell to whatever mark matches the solution there — 'filled' or 'x'. */
function revealCell(grid: Mark[][], target: Coord, solution: boolean[][]): void {
  grid[target.row][target.col] = solution[target.row][target.col] ? 'filled' : 'x'
}

/** First row/column index (in that order) with at least one still-wrong cell. */
function firstIncompleteLine(state: NonogramState): { axis: 'row' | 'col'; index: number } | null {
  const { size, solution } = state.level
  for (let r = 0; r < size; r++) {
    if (state.grid[r].some((mark, c) => (mark === 'filled') !== solution[r][c])) return { axis: 'row', index: r }
  }
  for (let c = 0; c < size; c++) {
    if (state.grid.some((row, r) => (row[c] === 'filled') !== solution[r][c])) return { axis: 'col', index: c }
  }
  return null
}

export function nonogramReducer(state: NonogramState, action: NonogramAction): NonogramState {
  switch (action.type) {
    case 'CELL_CLICK': {
      if (state.status === 'won') return state
      const grid = cloneGrid(state.grid)
      const mark = grid[action.row][action.col]
      const target = targetMark(state.markMode)
      grid[action.row][action.col] = mark === target ? 'empty' : target
      return withWinCheck({ ...state, grid, history: pushHistory(state) }, action.now)
    }

    case 'TOGGLE_MARK_MODE': {
      if (state.status === 'won') return state
      return { ...state, markMode: state.markMode === 'fill' ? 'x' : 'fill' }
    }

    case 'BEGIN_DRAG_MARK': {
      if (state.status === 'won') return state
      // Pushes one snapshot for the whole upcoming drag stroke — every DRAG_MARK_CELL
      // in that stroke mutates without pushing again, so a single Undo reverts it all.
      return { ...state, history: pushHistory(state) }
    }

    case 'DRAG_MARK_CELL': {
      if (state.status === 'won') return state
      const target = targetMark(state.markMode)
      const cell = state.grid[action.row][action.col]
      if (action.mode === 'add' ? cell === target : cell !== target) return state // no-op: already painted / nothing to erase

      // Single-cell structural-sharing update (unlike cloneGrid's full deep clone):
      // only the touched row gets a new array — this action fires repeatedly within
      // one fast drag gesture, so avoiding a full-grid re-render per step is what keeps
      // a real finger swipe smooth on a 10x10 board (see Board.tsx's DRAG_MARK_CELL,
      // the same trick for Queens).
      const newRow = state.grid[action.row].slice()
      newRow[action.col] = action.mode === 'add' ? target : 'empty'
      const grid = state.grid.slice()
      grid[action.row] = newRow
      return withWinCheck({ ...state, grid }, action.now)
    }

    case 'CLEAR': {
      if (state.status === 'won') return state
      // elapsedMs/runStartedAt are intentionally untouched — Clear never resets the timer.
      return { ...state, grid: emptyGrid(state.level.size), history: pushHistory(state) }
    }

    case 'UNDO': {
      if (state.status === 'won' || state.history.length === 0) return state
      const grid = state.history[state.history.length - 1]
      return { ...state, grid, history: state.history.slice(0, -1) }
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
      const target = firstWrongCell(state)
      if (!target) return state
      const grid = cloneGrid(state.grid)
      revealCell(grid, target, state.level.solution)
      return withWinCheck({ ...state, grid, history: pushHistory(state), hintsUsed: state.hintsUsed + 1 }, action.now)
    }

    case 'HINT_REVEAL_LINE': {
      if (state.status === 'won') return state
      const line = firstIncompleteLine(state)
      if (!line) return state
      const grid = cloneGrid(state.grid)
      const { size, solution } = state.level
      if (line.axis === 'row') {
        for (let c = 0; c < size; c++) revealCell(grid, { row: line.index, col: c }, solution)
      } else {
        for (let r = 0; r < size; r++) revealCell(grid, { row: r, col: line.index }, solution)
      }
      return withWinCheck({ ...state, grid, history: pushHistory(state), hintsUsed: state.hintsUsed + 1 }, action.now)
    }

    case 'HINT_CHECK': {
      // Non-mutating (see getWrongCells) — this just marks the solve as assisted,
      // matching every other paid hint tier.
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
