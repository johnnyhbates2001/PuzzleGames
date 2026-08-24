import { boundingRect, clueIndexAt, rectCells, type Coord, type PatchesLevelRecord } from '../engine/patches/types'
import { isMismatched, isRectFree, isSolved, placedRectAt, type PlacedRect } from '../engine/patches/validator'

export interface PatchesGameState {
  level: PatchesLevelRecord
  placed: PlacedRect[]
  dragAnchor: Coord | null
  /** Current pointer cell while a drag is in progress — null whenever dragAnchor is,
   *  and always updated together with it (see START_DRAG/DRAG_MOVE/COMMIT_DRAG/
   *  CANCEL_DRAG) — lets PatchesBoard render the rectangle growing live instead of
   *  only appearing once the drag commits. */
  dragEnd: Coord | null
  elapsedMs: number
  runStartedAt: number | null
  status: 'playing' | 'won'
  /** Hints used this level — a nonzero count marks the eventual completion "assisted",
   *  which skips the personal-best update (see recordPatchesCompletion in storage/db.ts). */
  hintsUsed: number
}

export interface PersistedPatchesSnapshot {
  placed: PlacedRect[]
  elapsedMs: number
}

export type PatchesAction =
  | { type: 'START_DRAG'; row: number; col: number }
  | { type: 'DRAG_MOVE'; row: number; col: number }
  | { type: 'COMMIT_DRAG'; row: number; col: number; now: number }
  | { type: 'CANCEL_DRAG' }
  | { type: 'REMOVE_RECT'; row: number; col: number }
  | { type: 'UNDO' }
  | { type: 'CLEAR' }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'LOAD'; level: PatchesLevelRecord; snapshot?: PersistedPatchesSnapshot }
  | { type: 'HINT_REVEAL_CLUE'; now: number }
  | { type: 'HINT_CHECK' }

export function createInitialState(level: PatchesLevelRecord): PatchesGameState {
  return {
    level,
    placed: [],
    dragAnchor: null,
    dragEnd: null,
    elapsedMs: 0,
    runStartedAt: null,
    status: 'playing',
    hintsUsed: 0,
  }
}

function coordKey(c: Coord): string {
  return `${c.row},${c.col}`
}

/** Non-mutating "check my work": coordKeys of every cell in a placed rectangle whose
 *  size/shape doesn't match its clue (COMMIT_DRAG allows this — only isSolved rejects it). */
export function getWrongCells(state: PatchesGameState): Set<string> {
  const wrong = new Set<string>()
  for (const p of state.placed) {
    if (isMismatched(p.rect, state.level.clues[p.clueIndex])) {
      for (const cell of rectCells(p.rect)) wrong.add(coordKey(cell))
    }
  }
  return wrong
}

function isCovered(placed: PlacedRect[], cell: Coord): boolean {
  return placedRectAt(placed, cell) !== -1
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
      if (clueIndexAt(state.level.clues, cell) === -1) return state // rectangles must start from a clue
      if (isCovered(state.placed, cell)) return state // that clue already has a rectangle
      return { ...state, dragAnchor: cell, dragEnd: cell }
    }

    case 'DRAG_MOVE': {
      if (state.status === 'won' || !state.dragAnchor) return state
      return { ...state, dragEnd: { row: action.row, col: action.col } }
    }

    case 'COMMIT_DRAG': {
      if (state.status === 'won' || !state.dragAnchor) return state
      const clueIndex = clueIndexAt(state.level.clues, state.dragAnchor)
      const rect = boundingRect(state.dragAnchor, { row: action.row, col: action.col }, state.level.size)
      if (!isRectFree(state.placed, state.level.clues, rect, clueIndex)) return { ...state, dragAnchor: null, dragEnd: null }

      const placed = [...state.placed, { rect, clueIndex, anchor: state.dragAnchor }]
      return withWinCheck({ ...state, placed, dragAnchor: null, dragEnd: null }, action.now)
    }

    case 'CANCEL_DRAG': {
      if (!state.dragAnchor) return state
      return { ...state, dragAnchor: null, dragEnd: null }
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
      return { ...state, placed: [], dragAnchor: null, dragEnd: null }
    }

    case 'PAUSE': {
      if (state.runStartedAt === null) return state
      return { ...state, elapsedMs: state.elapsedMs + (action.now - state.runStartedAt), runStartedAt: null }
    }

    case 'RESUME': {
      if (state.status === 'won' || state.runStartedAt !== null) return state
      return { ...state, runStartedAt: action.now }
    }

    case 'HINT_REVEAL_CLUE': {
      if (state.status === 'won') return state
      const placedClueIndices = new Set(state.placed.map((p) => p.clueIndex))
      const clueIndex = state.level.clues.findIndex((_, i) => !placedClueIndices.has(i))
      if (clueIndex === -1) return state
      const placed = [
        ...state.placed,
        { rect: state.level.solution[clueIndex], clueIndex, anchor: state.level.clues[clueIndex].cell },
      ]
      return withWinCheck({ ...state, placed, hintsUsed: state.hintsUsed + 1 }, action.now)
    }

    case 'HINT_CHECK': {
      if (state.status === 'won') return state
      return { ...state, hintsUsed: state.hintsUsed + 1 }
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
