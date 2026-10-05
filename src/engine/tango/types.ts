export type Difficulty = 'easy' | 'medium' | 'hard'

/** LinkedIn's Tango is always 6x6; hard steps up to 8x8 so the top tier isn't just
 *  "the same board with fewer clues". Must be even — each line holds exactly half of
 *  each symbol. */
export const TANGO_SIZE: Record<Difficulty, number> = {
  easy: 6,
  medium: 6,
  hard: 8,
}

export const EMPTY = 0
export const SUN = 1
export const MOON = 2

/** One cell's value: EMPTY, SUN, or MOON. */
export type TangoValue = 0 | 1 | 2

/** size x size grid of TangoValue. */
export type TangoGrid = TangoValue[][]

export interface Coord {
  row: number
  col: number
}

/** A sign drawn on the border between (row, col) and its right ('right') or lower
 *  ('down') neighbour: '=' means both cells hold the same symbol, '×' means opposite. */
export interface EdgeClue {
  row: number
  col: number
  dir: 'right' | 'down'
  kind: 'same' | 'diff'
}

export interface TangoLevelRecord {
  id: string
  difficulty: Difficulty
  size: number
  /** Pre-filled, locked cells — EMPTY marks a cell the player must fill in. */
  givens: TangoGrid
  edges: EdgeClue[]
  /** The (verified unique) fully-solved grid. Never shown to the player. */
  solution: TangoGrid
}

export function opposite(v: TangoValue): TangoValue {
  return v === SUN ? MOON : v === MOON ? SUN : EMPTY
}

/** The cell on the other side of an edge clue. */
export function edgeNeighbor(edge: EdgeClue): Coord {
  return edge.dir === 'right' ? { row: edge.row, col: edge.col + 1 } : { row: edge.row + 1, col: edge.col }
}

export function coordKey(c: Coord): string {
  return `${c.row},${c.col}`
}

export function emptyGrid(size: number): TangoGrid {
  return Array.from({ length: size }, () => new Array<TangoValue>(size).fill(EMPTY))
}

export function cloneGrid(grid: TangoGrid): TangoGrid {
  return grid.map((row) => row.slice())
}
