import type { Coord, LevelRecord } from '../engine/types'
import { coordKey } from '../engine/types'
import { isSolved } from '../engine/validator'
import { type CellState, cloneBoard, emptyBoard, emptyCell, hasX } from './types'

export interface GameState {
  level: LevelRecord
  board: CellState[][]
  autoPlaceX: boolean
  /** Full-board snapshot stack for Undo — cheap at this board size (<=100 cells), and
   *  avoids re-deriving the auto-X bookkeeping's inverse, which forward CELL_CLICK
   *  handling already computes correctly only for its own specific case. */
  history: CellState[][][]
  elapsedMs: number
  runStartedAt: number | null
  status: 'playing' | 'won'
  /** Hints used this level — a nonzero count marks the eventual completion "assisted",
   *  which skips the personal-best update (see recordCompletion in storage/db.ts). */
  hintsUsed: number
}

export interface PersistedGameSnapshot {
  board: CellState[][]
  elapsedMs: number
}

export type GameAction =
  | { type: 'CELL_CLICK'; row: number; col: number; now: number }
  | { type: 'CLEAR'; now: number }
  | { type: 'UNDO' }
  | { type: 'SET_AUTO_X'; enabled: boolean }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'LOAD'; level: LevelRecord; autoPlaceX: boolean; snapshot?: PersistedGameSnapshot }
  | { type: 'BEGIN_DRAG_MARK' }
  | { type: 'DRAG_MARK_CELL'; row: number; col: number; mode: 'add' | 'erase' }
  | { type: 'HINT_REVEAL_CELL'; now: number }
  | { type: 'HINT_SOLVE_REGION'; now: number }
  | { type: 'HINT_CHECK' }

const MAX_HISTORY = 200

export function createInitialState(level: LevelRecord, autoPlaceX: boolean): GameState {
  return {
    level,
    board: emptyBoard(level.size),
    autoPlaceX,
    history: [],
    elapsedMs: 0,
    runStartedAt: null,
    status: 'playing',
    hintsUsed: 0,
  }
}

/** Cells auto-X'd by a queen at (row,col): its row, column, region, and 8 neighbors. */
function affectedCells(row: number, col: number, level: LevelRecord): Coord[] {
  const { size, regions } = level
  const region = regions[row][col]
  const seen = new Set<string>()
  const out: Coord[] = []
  const add = (r: number, c: number) => {
    if (r === row && c === col) return
    const key = `${r},${c}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ row: r, col: c })
  }
  for (let c = 0; c < size; c++) add(row, c)
  for (let r = 0; r < size; r++) add(r, col)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (regions[r][c] === region) add(r, c)
    }
  }
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = row + dr
      const c = col + dc
      if (r >= 0 && r < size && c >= 0 && c < size) add(r, c)
    }
  }
  return out
}

function applyAutoX(board: CellState[][], row: number, col: number, level: LevelRecord): void {
  const queenId = coordKey({ row, col })
  for (const cell of affectedCells(row, col, level)) {
    const target = board[cell.row][cell.col]
    if (!target.queen) target.autoXSources.add(queenId)
  }
}

/** Removes only this queen's auto-X contribution from every cell — never touches manualX or other queens'. */
function removeAutoX(board: CellState[][], row: number, col: number): void {
  const queenId = coordKey({ row, col })
  for (const boardRow of board) {
    for (const cell of boardRow) cell.autoXSources.delete(queenId)
  }
}

function withWinCheck(state: GameState, now: number): GameState {
  const queens: Coord[] = []
  for (let r = 0; r < state.level.size; r++) {
    for (let c = 0; c < state.level.size; c++) {
      if (state.board[r][c].queen) queens.push({ row: r, col: c })
    }
  }
  if (!isSolved(queens, state.level.size, state.level.regions)) return state
  const elapsedMs = state.runStartedAt !== null ? state.elapsedMs + (now - state.runStartedAt) : state.elapsedMs
  return { ...state, status: 'won', elapsedMs, runStartedAt: null }
}

/** Places the solution queen at `target`, first clearing any (wrong) queen already in
 *  that row — every row holds exactly one queen in a solved puzzle. */
function revealQueen(board: CellState[][], target: Coord, level: LevelRecord, autoPlaceX: boolean): void {
  for (let c = 0; c < level.size; c++) {
    if (board[target.row][c].queen) {
      board[target.row][c] = emptyCell()
      removeAutoX(board, target.row, c)
    }
  }
  board[target.row][target.col] = { queen: true, manualX: false, autoXSources: new Set() }
  if (autoPlaceX) applyAutoX(board, target.row, target.col, level)
}

function pushHistory(state: GameState): CellState[][][] {
  const next = [...state.history, cloneBoard(state.board)]
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
}

/** Non-mutating "check my work": coordKeys of placed queens that don't match the solution. */
export function getWrongQueens(state: GameState): Set<string> {
  const solutionKeys = new Set(state.level.solution.map(coordKey))
  const wrong = new Set<string>()
  for (let r = 0; r < state.level.size; r++) {
    for (let c = 0; c < state.level.size; c++) {
      const coord = { row: r, col: c }
      if (state.board[r][c].queen && !solutionKeys.has(coordKey(coord))) wrong.add(coordKey(coord))
    }
  }
  return wrong
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'CELL_CLICK': {
      if (state.status === 'won') return state
      const board = cloneBoard(state.board)
      const cell = board[action.row][action.col]

      if (cell.queen) {
        // queen -> empty: the clicked cell resets fully; only THIS queen's auto-X
        // contribution is stripped from every other cell.
        board[action.row][action.col] = emptyCell()
        removeAutoX(board, action.row, action.col)
      } else if (hasX(cell)) {
        // X -> queen: placing a queen clears this cell's own X.
        board[action.row][action.col] = { queen: true, manualX: false, autoXSources: new Set() }
        if (state.autoPlaceX) applyAutoX(board, action.row, action.col, state.level)
      } else {
        // empty -> X (manual)
        board[action.row][action.col] = { ...cell, manualX: true }
      }

      return withWinCheck({ ...state, board, history: pushHistory(state) }, action.now)
    }

    case 'CLEAR': {
      if (state.status === 'won') return state
      // elapsedMs/runStartedAt are intentionally untouched — Clear never resets the timer.
      return { ...state, board: emptyBoard(state.level.size), history: pushHistory(state) }
    }

    case 'UNDO': {
      if (state.status === 'won' || state.history.length === 0) return state
      const board = state.history[state.history.length - 1]
      return { ...state, board, history: state.history.slice(0, -1) }
    }

    case 'SET_AUTO_X': {
      const board = cloneBoard(state.board)
      if (action.enabled) {
        for (let r = 0; r < state.level.size; r++) {
          for (let c = 0; c < state.level.size; c++) {
            if (board[r][c].queen) applyAutoX(board, r, c, state.level)
          }
        }
      } else {
        for (const row of board) {
          for (const cell of row) cell.autoXSources.clear()
        }
      }
      return { ...state, board, autoPlaceX: action.enabled }
    }

    case 'PAUSE': {
      if (state.runStartedAt === null) return state
      return { ...state, elapsedMs: state.elapsedMs + (action.now - state.runStartedAt), runStartedAt: null }
    }

    case 'RESUME': {
      if (state.status === 'won' || state.runStartedAt !== null) return state
      return { ...state, runStartedAt: action.now }
    }

    case 'BEGIN_DRAG_MARK': {
      if (state.status === 'won') return state
      // Pushes one snapshot for the whole upcoming drag stroke — every DRAG_MARK_CELL
      // in that stroke mutates without pushing again, so a single Undo reverts it all.
      return { ...state, history: pushHistory(state) }
    }

    case 'DRAG_MARK_CELL': {
      if (state.status === 'won') return state
      const cell = state.board[action.row][action.col]
      if (cell.queen) return state
      const currentlyX = hasX(cell)
      if (action.mode === 'add' ? currentlyX : !currentlyX) return state // no-op: already painted / nothing to erase

      // Single-cell structural-sharing update (unlike cloneBoard's full deep clone):
      // only the touched row gets a new array and the touched cell a new object, every
      // other row/cell keeps its exact reference. This action fires repeatedly within
      // one fast drag gesture, so avoiding a full-board re-render per step is what keeps
      // a real finger swipe smooth on a 10x10 board.
      const newCell: CellState =
        action.mode === 'add'
          ? { ...cell, manualX: true }
          : { ...cell, manualX: false, autoXSources: new Set() }
      const newRow = state.board[action.row].slice()
      newRow[action.col] = newCell
      const board = state.board.slice()
      board[action.row] = newRow
      return { ...state, board }
    }

    case 'HINT_REVEAL_CELL': {
      if (state.status === 'won') return state
      const target = state.level.solution.find((coord) => !state.board[coord.row][coord.col].queen)
      if (!target) return state
      const board = cloneBoard(state.board)
      revealQueen(board, target, state.level, state.autoPlaceX)
      return withWinCheck(
        { ...state, board, history: pushHistory(state), hintsUsed: state.hintsUsed + 1 },
        action.now,
      )
    }

    case 'HINT_SOLVE_REGION': {
      if (state.status === 'won') return state
      const solvedRegions = new Set(
        state.level.solution
          .filter((coord) => state.board[coord.row][coord.col].queen)
          .map((coord) => state.level.regions[coord.row][coord.col]),
      )
      const target = state.level.solution.find(
        (coord) => !solvedRegions.has(state.level.regions[coord.row][coord.col]),
      )
      if (!target) return state
      const board = cloneBoard(state.board)
      revealQueen(board, target, state.level, state.autoPlaceX)
      return withWinCheck(
        { ...state, board, history: pushHistory(state), hintsUsed: state.hintsUsed + 1 },
        action.now,
      )
    }

    case 'HINT_CHECK': {
      // Non-mutating (see getWrongQueens) — this just marks the solve as assisted,
      // matching every other paid hint tier.
      if (state.status === 'won') return state
      return { ...state, hintsUsed: state.hintsUsed + 1 }
    }

    case 'LOAD': {
      const base = createInitialState(action.level, action.autoPlaceX)
      if (!action.snapshot) return base
      return { ...base, board: cloneBoard(action.snapshot.board), elapsedMs: action.snapshot.elapsedMs }
    }

    default:
      return state
  }
}
