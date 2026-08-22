import { rectCells, rectContains, shapeOf, type Coord, type PatchClue, type Rect } from './types.ts'

export interface PlacedRect {
  rect: Rect
  clueIndex: number
}

/** Whether `rect` (attributed to `ownerClueIndex`) can be committed: it must not
 *  overlap any already-placed rectangle, and must not swallow another clue's cell
 *  (each rectangle may contain exactly one clue — its own). */
export function isRectFree(placed: PlacedRect[], clues: PatchClue[], rect: Rect, ownerClueIndex: number): boolean {
  const cells = rectCells(rect)
  for (const p of placed) {
    for (const cell of cells) {
      if (rectContains(p.rect, cell)) return false
    }
  }
  for (let i = 0; i < clues.length; i++) {
    if (i === ownerClueIndex) continue
    if (cells.some((c) => c.row === clues[i].cell.row && c.col === clues[i].cell.col)) return false
  }
  return true
}

export function isMismatched(rect: Rect, clue: PatchClue): boolean {
  return rect.width * rect.height !== clue.area || shapeOf(rect) !== clue.shape
}

/** Which placed rectangle (if any) covers a cell — used to route taps to "remove". */
export function placedRectAt(placed: PlacedRect[], cell: Coord): number {
  return placed.findIndex((p) => rectContains(p.rect, cell))
}

export function isSolved(size: number, clues: PatchClue[], placed: PlacedRect[]): boolean {
  if (placed.length !== clues.length) return false
  let coveredCells = 0
  for (const p of placed) {
    if (isMismatched(p.rect, clues[p.clueIndex])) return false
    coveredCells += p.rect.width * p.rect.height
  }
  // Every rectangle non-overlapping (enforced at commit time) + matching its clue's
  // area + summing to the full grid means this must be THE unique verified solution —
  // same "trust generation-time uniqueness" reasoning validator.ts uses in every game.
  return coveredCells === size * size
}
