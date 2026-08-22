import type { Coord, PatchesLevelRecord, Rect } from '../engine/patches/types'
import { isRectFree, isSolved, placedRectAt, type PlacedRect } from '../engine/patches/validator'

export interface PatchesGameState {
  level: PatchesLevelRecord
  placed: PlacedRect[]
  dragAnchor: Coord | null
  elapsedMs: number
  runStartedAt: number | null
  status: 'playing' | 'won'
}

export interface PersistedPatchesSnapshot {
  placed: PlacedRect[]
  elapsedMs: number
}

export type PatchesAction =
  | { type: 'START_DRAG'; row: number; col: number }
  | { type: 'COMMIT_DRAG'; row: number; col: number; now: number }
  | { type: 'CANCEL_DRAG' }
  | { type: 'REMOVE_RECT'; row: number; col: number }
  | { type: 'UNDO' }
  | { type: 'CLEAR' }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'LOAD'; level: PatchesLevelRecord; snapshot?: PersistedPatchesSnapshot }

export function createInitialState(level: PatchesLevelRecord): PatchesGameState {
  return {
    level,
    placed: [],
    dragAnchor: null,
    elapsedMs: 0,
    runStartedAt: null,
    status: 'playing',
  }
}

function clueIndexAt(level: PatchesLevelRecord, cell: Coord): number {
  return level.clues.findIndex((c) => c.cell.row === cell.row && c.cell.col === cell.col)
}

function isCovered(placed: PlacedRect[], cell: Coord): boolean {
  return placedRectAt(placed, cell) !== -1
}

function boundingRect(a: Coord, b: Coord, size: number): Rect {
  const row = Math.max(0, Math.min(a.row, b.row))
  const col = Math.max(0, Math.min(a.col, b.col))
  const rowEnd = Math.min(size - 1, Math.max(a.row, b.row))
  const colEnd = Math.min(size - 1, Math.max(a.col, b.col))
  return { row, col, width: colEnd - col + 1, height: rowEnd - row + 1 }
}

function withWinCheck(state: PatchesGameState, now: number): PatchesGameState {
  if (!isSolved(state.level.size, state.level.clues, state.placed)) return state
  const elapsedMs = state.runStartedAt !== null ? state.elapsedMs + (now - state.runStartedAt) : state.elapsedMs
  return { ...state, status: 'won', elapsedMs, runStartedAt: null }
}

export function patchesReducer(state: PatchesGameState, action: PatchesAction): PatchesGameState {
  switch (action.type) {
    case 'START_DRAG': {
      if (state.status === 'won') return state
      const cell = { row: action.row, col: action.col }
      if (clueIndexAt(state.level, cell) === -1) return state // rectangles must start from a clue
      if (isCovered(state.placed, cell)) return state // that clue already has a rectangle
      return { ...state, dragAnchor: cell }
    }

    case 'COMMIT_DRAG': {
      if (state.status === 'won' || !state.dragAnchor) return state
      const clueIndex = clueIndexAt(state.level, state.dragAnchor)
      const rect = boundingRect(state.dragAnchor, { row: action.row, col: action.col }, state.level.size)
      if (!isRectFree(state.placed, state.level.clues, rect, clueIndex)) return { ...state, dragAnchor: null }

      const placed = [...state.placed, { rect, clueIndex }]
      return withWinCheck({ ...state, placed, dragAnchor: null }, action.now)
    }

    case 'CANCEL_DRAG': {
      if (!state.dragAnchor) return state
      return { ...state, dragAnchor: null }
    }

    case 'REMOVE_RECT': {
      if (state.status === 'won') return state
      const idx = placedRectAt(state.placed, { row: action.row, col: action.col })
      if (idx === -1) return state
      return { ...state, placed: [...state.placed.slice(0, idx), ...state.placed.slice(idx + 1)] }
    }

    case 'UNDO': {
      if (state.status === 'won' || state.placed.length === 0) return state
      return { ...state, placed: state.placed.slice(0, -1) }
    }

    case 'CLEAR': {
      if (state.status === 'won' || state.placed.length === 0) return state
      return { ...state, placed: [], dragAnchor: null }
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
      return { ...base, placed: action.snapshot.placed, elapsedMs: action.snapshot.elapsedMs }
    }

    default:
      return state
  }
}
