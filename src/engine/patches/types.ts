export type Difficulty = 'easy' | 'medium' | 'hard'

export const PATCHES_SIZE: Record<Difficulty, number> = {
  easy: 5,
  medium: 7,
  hard: 8,
}

export interface Coord {
  row: number
  col: number
}

export interface Rect {
  row: number
  col: number
  width: number
  height: number
}

export type PatchShape = 'square' | 'tall' | 'wide'

export function shapeOf(rect: Rect): PatchShape {
  if (rect.width === rect.height) return 'square'
  return rect.height > rect.width ? 'tall' : 'wide'
}

export function rectContains(rect: Rect, cell: Coord): boolean {
  return cell.row >= rect.row && cell.row < rect.row + rect.height && cell.col >= rect.col && cell.col < rect.col + rect.width
}

/** All [width, height] factor pairs of `area`. */
export function divisorPairs(area: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = []
  for (let w = 1; w <= area; w++) {
    if (area % w === 0) pairs.push([w, area / w])
  }
  return pairs
}

/** [width, height] pairs whose orientation matches `shape` for the given area. */
export function candidateDims(area: number, shape: PatchShape): Array<[number, number]> {
  return divisorPairs(area).filter(([w, h]) =>
    shape === 'square' ? w === h : shape === 'tall' ? h > w : w > h,
  )
}

export function rectCells(rect: Rect): Coord[] {
  const out: Coord[] = []
  for (let r = rect.row; r < rect.row + rect.height; r++) {
    for (let c = rect.col; c < rect.col + rect.width; c++) out.push({ row: r, col: c })
  }
  return out
}

export interface PatchClue {
  /** The single cell within this patch's target rectangle that shows the clue. */
  cell: Coord
  area: number
  shape: PatchShape
}

export function clueIndexAt(clues: PatchClue[], cell: Coord): number {
  return clues.findIndex((c) => c.cell.row === cell.row && c.cell.col === cell.col)
}

/** The rectangle spanning two opposite corners, clamped to the grid — used both to
 *  commit a drag (patchesReducer.ts) and to render its live growing preview while
 *  the drag is still in progress (PatchesBoard.tsx). */
export function boundingRect(a: Coord, b: Coord, size: number): Rect {
  const row = Math.max(0, Math.min(a.row, b.row))
  const col = Math.max(0, Math.min(a.col, b.col))
  const rowEnd = Math.min(size - 1, Math.max(a.row, b.row))
  const colEnd = Math.min(size - 1, Math.max(a.col, b.col))
  return { row, col, width: colEnd - col + 1, height: rowEnd - row + 1 }
}

export interface PatchesLevelRecord {
  id: string
  difficulty: Difficulty
  size: number
  clues: PatchClue[]
  /** The (verified unique) solved rectangle partition — one entry per clue, same order. */
  solution: Rect[]
}
