import { boxIndex, coordKey, SUDOKU_SIZE, type Coord, type SudokuLevelRecord } from '../engine/sudoku/types'
import { isSolved } from '../engine/sudoku/validator'
import { boardFromPuzzle, boardValues, cloneBoard, type SudokuCellState } from './sudokuTypes'

export interface SudokuGameState {
  level: SudokuLevelRecord
  board: SudokuCellState[][]
  selected: Coord | null
  /** When true, INPUT_DIGIT toggles a pencil mark instead of setting the cell's value. */
  noteMode: boolean
  /** Full-board snapshot stack for Undo — cheap at 81 cells. */
  history: SudokuCellState[][][]
  elapsedMs: number
  runStartedAt: number | null
  status: 'playing' | 'won'
  /** Hints used this level — a nonzero count marks the eventual completion "assisted",
   *  which skips the personal-best update (see recordSudokuCompletion in storage/db.ts). */
  hintsUsed: number
}

export interface PersistedSudokuSnapshot {
  board: SudokuCellState[][]
  elapsedMs: number
}

export type SudokuAction =
  | { type: 'SELECT_CELL'; row: number; col: number }
  | { type: 'INPUT_DIGIT'; digit: number; now: number }
  | { type: 'ERASE'; now: number }
  | { type: 'CLEAR'; now: number }
  | { type: 'UNDO' }
  | { type: 'TOGGLE_NOTE_MODE' }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'LOAD'; level: SudokuLevelRecord; snapshot?: PersistedSudokuSnapshot }
  | { type: 'HINT_REVEAL_CELL'; now: number }
  | { type: 'HINT_SOLVE_BOX'; now: number }

const MAX_HISTORY = 200

export function createInitialState(level: SudokuLevelRecord): SudokuGameState {
  return {
    level,
    board: boardFromPuzzle(level.puzzle),
    selected: null,
    noteMode: false,
    history: [],
    elapsedMs: 0,
    runStartedAt: null,
    status: 'playing',
    hintsUsed: 0,
  }
}

/** First non-given cell whose value doesn't match the solution (0 counts as a mismatch). */
function firstWrongCell(state: SudokuGameState): Coord | null {
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      const cell = state.board[r][c]
      if (!cell.given && cell.value !== state.level.solution[r][c]) return { row: r, col: c }
    }
  }
  return null
}

/** First 3x3 box index (0-8) containing a non-given cell that doesn't match the solution. */
function firstIncompleteBox(state: SudokuGameState): number | null {
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      const cell = state.board[r][c]
      if (!cell.given && cell.value !== state.level.solution[r][c]) return boxIndex(r, c)
    }
  }
  return null
}

/** Non-mutating "check my work": coordKeys of filled cells that don't match the solution. */
export function getWrongCells(state: SudokuGameState): Set<string> {
  const wrong = new Set<string>()
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      const cell = state.board[r][c]
      if (!cell.given && cell.value !== 0 && cell.value !== state.level.solution[r][c]) {
        wrong.add(coordKey({ row: r, col: c }))
      }
    }
  }
  return wrong
}

function withWinCheck(state: SudokuGameState, now: number): SudokuGameState {
  if (!isSolved(boardValues(state.board))) return state
  const elapsedMs = state.runStartedAt !== null ? state.elapsedMs + (now - state.runStartedAt) : state.elapsedMs
  return { ...state, status: 'won', elapsedMs, runStartedAt: null }
}

function pushHistory(state: SudokuGameState): SudokuCellState[][][] {
  const next = [...state.history, cloneBoard(state.board)]
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
}

export function sudokuReducer(state: SudokuGameState, action: SudokuAction): SudokuGameState {
  switch (action.type) {
    case 'SELECT_CELL': {
      if (state.status === 'won') return state
      return { ...state, selected: { row: action.row, col: action.col } }
    }

    case 'INPUT_DIGIT': {
      if (state.status === 'won' || !state.selected) return state
      const { row, col } = state.selected
      const cell = state.board[row][col]
      if (cell.given) return state

      if (state.noteMode) {
        if (cell.value !== 0) return state // notes only make sense on an empty cell
        const board = cloneBoard(state.board)
        const notes = new Set(cell.notes)
        if (notes.has(action.digit)) notes.delete(action.digit)
        else notes.add(action.digit)
        board[row][col] = { ...cell, notes }
        return { ...state, board, history: pushHistory(state) }
      }

      if (cell.value === action.digit) return state
      const board = cloneBoard(state.board)
      // Filling a cell always clears its own pencil marks — they're moot once solved.
      board[row][col] = { ...cell, value: action.digit, notes: new Set() }
      return withWinCheck({ ...state, board, history: pushHistory(state) }, action.now)
    }

    case 'ERASE': {
      if (state.status === 'won' || !state.selected) return state
      const { row, col } = state.selected
      const cell = state.board[row][col]
      if (cell.given || (cell.value === 0 && cell.notes.size === 0)) return state

      const board = cloneBoard(state.board)
      board[row][col] = { value: 0, given: false, notes: new Set() }
      return { ...state, board, history: pushHistory(state) }
    }

    case 'CLEAR': {
      if (state.status === 'won') return state
      // elapsedMs/runStartedAt are intentionally untouched — Clear never resets the timer.
      const board = state.board.map((row) => row.map((cell) => (cell.given ? cell : { value: 0, given: false, notes: new Set<number>() })))
      return { ...state, board, history: pushHistory(state) }
    }

    case 'UNDO': {
      if (state.status === 'won' || state.history.length === 0) return state
      const board = state.history[state.history.length - 1]
      return { ...state, board, history: state.history.slice(0, -1) }
    }

    case 'TOGGLE_NOTE_MODE': {
      if (state.status === 'won') return state
      return { ...state, noteMode: !state.noteMode }
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
      const board = cloneBoard(state.board)
      const cell = board[target.row][target.col]
      board[target.row][target.col] = { ...cell, value: state.level.solution[target.row][target.col], notes: new Set() }
      return withWinCheck({ ...state, board, history: pushHistory(state), hintsUsed: state.hintsUsed + 1 }, action.now)
    }

    case 'HINT_SOLVE_BOX': {
      if (state.status === 'won') return state
      const box = firstIncompleteBox(state)
      if (box === null) return state
      const board = cloneBoard(state.board)
      for (let r = 0; r < SUDOKU_SIZE; r++) {
        for (let c = 0; c < SUDOKU_SIZE; c++) {
          if (boxIndex(r, c) !== box) continue
          const cell = board[r][c]
          if (!cell.given) board[r][c] = { ...cell, value: state.level.solution[r][c], notes: new Set() }
        }
      }
      return withWinCheck({ ...state, board, history: pushHistory(state), hintsUsed: state.hintsUsed + 1 }, action.now)
    }

    case 'LOAD': {
      const base = createInitialState(action.level)
      if (!action.snapshot) return base
      return { ...base, board: cloneBoard(action.snapshot.board), elapsedMs: action.snapshot.elapsedMs }
    }

    default:
      return state
  }
}
