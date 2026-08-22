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
const PARTITION_RETRIES = 80

export function generatePartition(size: number, targetCount: number, rng: Rng): Rect[] {
  let rects: Rect[] = [{ row: 0, col: 0, width: size, height: size }]

  while (rects.length < targetCount) {
    const splittable = rects
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.width > 1 || r.height > 1)
    if (splittable.length === 0) break

    const { r: target, i: idx } = splittable[Math.floor(rng() * splittable.length)]
    const canVertical = target.width > 1
    const canHorizontal = target.height > 1
    const vertical = canVertical && (!canHorizontal || rng() < 0.5)

    let a: Rect
    let b: Rect
    if (vertical) {
      const splitAt = 1 + Math.floor(rng() * (target.width - 1)) // 1..width-1
      a = { ...target, width: splitAt }
      b = { ...target, col: target.col + splitAt, width: target.width - splitAt }
    } else {
      const splitAt = 1 + Math.floor(rng() * (target.height - 1))
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
