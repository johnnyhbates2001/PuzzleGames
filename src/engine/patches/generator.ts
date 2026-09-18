import type { Rng } from '../rng.ts'
import { shuffle } from '../rng.ts'
import { PATCHES_SIZE, shapeOf, type Difficulty, type PatchClue, type PatchesLevelRecord, type Rect } from './types.ts'
import { countSolutions } from './solver.ts'

/**
 * Level generation algorithm
 * ---------------------------
 * 1. generatePartition — a random guillotine partition: start with the whole grid as
 *    one rectangle, then repeatedly pick a random splittable rectangle and cut it in
 *    half (at a random offset, horizontally or vertically) until reaching the target
 *    rectangle count. Every guillotine partition is trivially a valid rectangle
 *    partition of the grid by construction, so no repair step is needed the way
 *    Queens' region generator needs one.
 *
 * 2. One clue is placed at a random cell inside each rectangle, showing that
 *    rectangle's real area and shape (square/tall/wide) — always the rectangle's true
 *    orientation, never the ambiguous "any" wildcard (that would require proving no
 *    other orientation could validly complete the full partition, which needs its own
 *    extra verification pass; skipped here to keep generation simple).
 *
 * 3. generateLevel retries with a fresh partition whenever the resulting clue set
 *    isn't unique — unlike Zip's wall-adding repair, there's no "add one constraint"
 *    move for a rectangle partition, so a non-unique layout is simply discarded.
 */

const TARGET_RECT_COUNT: Record<Difficulty, number> = { easy: 9, medium: 11, hard: 9 }
/** Cheap structural checks (isBalanced) reject most bad partitions before the expensive
 *  solver runs, so this can afford to be much higher than a naive retry count. */
const PARTITION_RETRIES = 400
/** No generated rectangle may have area smaller than this (no 1x1 patches). */
const MIN_AREA = 2

/** A single rectangle may not claim more than this fraction of the whole grid — without
 *  it, guillotine partitioning tends to carve a few thin slivers off one corner and
 *  leave the rest as one dominant leftover rectangle, which trivializes the puzzle (the
 *  giant patch is nearly forced, and the slivers are too small to reason about). Easy's
 *  5x5 grid is too small for any rectangle to get "massive" in the first place (9 rects
 *  over 25 cells caps out well below medium/hard's ratio), so it gets a looser cap purely
 *  to avoid rejecting nearly everything.
 */
const MAX_AREA_FRACTION: Record<Difficulty, number> = { easy: 0.4, medium: 0.3, hard: 0.28 }
/** Rectangles at or below this area are "tiny" — a couple add welcome texture, but a
 *  partition dominated by them (the flip side of one giant leftover) is just as flat.
 *  Easy's rect-count-to-area ratio makes most pieces tiny by construction (9 rects
 *  average 2.8 cells each), so only the fully-uniform all-tiny case is rejected there. */
const TINY_AREA = 3
const MAX_TINY_RECTS: Record<Difficulty, number> = { easy: 8, medium: 5, hard: 2 }

/** Rejects the "one massive leftover plus a pile of slivers" shape that plain guillotine
 *  partitioning tends to produce, so generateLevel retries instead of accepting it. */
function isBalanced(rects: Rect[], size: number, difficulty: Difficulty): boolean {
  const maxAllowed = Math.floor(size * size * MAX_AREA_FRACTION[difficulty])
  let tinyCount = 0
  for (const rect of rects) {
    const area = rect.width * rect.height
    if (area > maxAllowed) return false
    if (area <= TINY_AREA) tinyCount++
  }
  return tinyCount <= MAX_TINY_RECTS[difficulty]
}

/** Smallest a piece may be along the axis being split, given the fixed size of the
 *  OTHER axis — 1 is fine as long as the other axis is at least 2 (area = 1 *
 *  otherDim >= MIN_AREA already), but if the other axis is also 1, this axis needs
 *  to be at least MIN_AREA itself so the piece's own area clears the floor. */
function minSegment(otherDim: number): number {
  return otherDim >= MIN_AREA ? 1 : MIN_AREA
}

/** Inclusive [lo, hi] range of valid split offsets along `length` that leave both
 *  resulting pieces at or above MIN_AREA area, or null if no such split exists. */
function splitRange(length: number, otherDim: number): [number, number] | null {
  const min = minSegment(otherDim)
  const max = length - min
  return min <= max ? [min, max] : null
}

export function generatePartition(size: number, targetCount: number, rng: Rng): Rect[] {
  let rects: Rect[] = [{ row: 0, col: 0, width: size, height: size }]

  while (rects.length < targetCount) {
    const candidates = rects
      .map((r, i) => ({ r, i, vRange: splitRange(r.width, r.height), hRange: splitRange(r.height, r.width) }))
      .filter(({ vRange, hRange }) => vRange !== null || hRange !== null)
    if (candidates.length === 0) break

    // Weight by area, not uniformly: picking every splittable rect with equal odds lets
    // one large rectangle sit unsplit for many iterations while everything else gets
    // fragmented around it. Weighting by area means a big rectangle keeps getting
    // subdivided in proportion to its size, so pieces stay comparable to each other.
    const totalArea = candidates.reduce((sum, { r }) => sum + r.width * r.height, 0)
    let pick = rng() * totalArea
    let chosen = candidates[candidates.length - 1]
    for (const candidate of candidates) {
      pick -= candidate.r.width * candidate.r.height
      if (pick <= 0) {
        chosen = candidate
        break
      }
    }
    const { r: target, i: idx, vRange, hRange } = chosen
    const vertical = vRange !== null && (hRange === null || rng() < 0.5)
    const [lo, hi] = (vertical ? vRange : hRange)!
    // Average two uniform draws (a triangular distribution) instead of one, biasing the
    // cut toward the middle of the piece rather than uniformly across its whole span —
    // a single uniform draw makes a hairline off-the-edge sliver just as likely as an
    // even split, which is the other half of where the massive-leftover shape comes from.
    const t = (rng() + rng()) / 2
    const splitAt = lo + Math.round(t * (hi - lo))

    let a: Rect
    let b: Rect
    if (vertical) {
      a = { ...target, width: splitAt }
      b = { ...target, col: target.col + splitAt, width: target.width - splitAt }
    } else {
      a = { ...target, height: splitAt }
      b = { ...target, row: target.row + splitAt, height: target.height - splitAt }
    }

    rects = [...rects.slice(0, idx), a, b, ...rects.slice(idx + 1)]
  }

  return rects
}

export function cluesFromPartition(rects: Rect[], rng: Rng): PatchClue[] {
  return rects.map((rect) => {
    // The clue cell must be a corner: the player draws a rectangle by dragging from
    // the clue to its opposite corner, and a bounding box between two points always
    // treats both as corners — an interior clue cell would make the true rectangle
    // physically undrawable. Which of the 4 corners varies for visual variety.
    const dr = rng() < 0.5 ? 0 : rect.height - 1
    const dc = rng() < 0.5 ? 0 : rect.width - 1
    return {
      cell: { row: rect.row + dr, col: rect.col + dc },
      area: rect.width * rect.height,
      shape: shapeOf(rect),
    }
  })
}

export function generateLevel(difficulty: Difficulty, rng: Rng): PatchesLevelRecord | null {
  const size = PATCHES_SIZE[difficulty]
  const targetCount = TARGET_RECT_COUNT[difficulty]

  for (let attempt = 0; attempt < PARTITION_RETRIES; attempt++) {
    const rects = generatePartition(size, targetCount, rng)
    if (!isBalanced(rects, size, difficulty)) continue
    const order = shuffle(
      rects.map((_, i) => i),
      rng,
    )
    const shuffledRects = order.map((i) => rects[i])
    const clues = cluesFromPartition(shuffledRects, rng)

    if (countSolutions(size, clues, 2) === 1) {
      return { id: makeId(), difficulty, size, clues, solution: shuffledRects }
    }
  }

  return null
}

function makeId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `lvl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
