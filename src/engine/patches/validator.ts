import { boundingRect, rectCells, rectContains, shapeOf, type Coord, type PatchClue, type Rect } from './types.ts'

export interface PlacedRect {
  rect: Rect
  clueIndex: number
  /** The clue cell the drag started from (or, for a hint-revealed rect, the clue
   *  cell itself) — used only to drive the fill-in animation's stagger (Manhattan
   *  distance from here). Optional: rects persisted before this field existed
   *  won't have it, and simply render with no stagger. */
  anchor?: Coord
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

/** Finds the corner closest to `target` (never past it, always between it and `anchor`)
 *  whose bounding rectangle with `anchor` is free — so a drag that overshoots by a cell
 *  or two into an already-placed rectangle (or another clue's cell) snaps back to the
 *  largest rectangle it can still legally form, the same way cellFromPoint already
 *  clamps a drag that strays outside the grid entirely instead of discarding it. Anchor
 *  itself is always free (START_DRAG only allows starting from an uncovered clue cell),
 *  so this always has at least that trivial fallback and never needs to signal "no rect
 *  fits at all". */
export function nearestFreeCorner(
  placed: PlacedRect[],
  clues: PatchClue[],
  size: number,
  anchor: Coord,
  target: Coord,
  clueIndex: number,
): Coord {
  if (isRectFree(placed, clues, boundingRect(anchor, target, size), clueIndex)) return target

  const rowStep = target.row >= anchor.row ? 1 : -1
  const colStep = target.col >= anchor.col ? 1 : -1
  const rowSpan = Math.abs(target.row - anchor.row)
  const colSpan = Math.abs(target.col - anchor.col)

  let best = anchor
  let bestShrink = rowSpan + colSpan
  let bestArea = 1

  for (let dr = 0; dr <= rowSpan; dr++) {
    for (let dc = 0; dc <= colSpan; dc++) {
      if (dr === 0 && dc === 0) continue // anchor itself is the fallback already recorded above
      const candidate = { row: anchor.row + dr * rowStep, col: anchor.col + dc * colStep }
      const rect = boundingRect(anchor, candidate, size)
      if (!isRectFree(placed, clues, rect, clueIndex)) continue
      const shrink = rowSpan - dr + (colSpan - dc)
      const area = rect.width * rect.height
      // Prefer whatever stays closest to where the pointer actually is; among equally
      // close options prefer the larger rectangle.
      if (shrink < bestShrink || (shrink === bestShrink && area > bestArea)) {
        best = candidate
        bestShrink = shrink
        bestArea = area
      }
    }
  }
  return best
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
