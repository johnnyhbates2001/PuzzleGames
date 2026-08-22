import { candidateDims, rectCells, type Coord, type PatchClue, type Rect } from './types.ts'

/**
 * Backtracking exact-cover-style solver for the rectangle-partition puzzle: process
 * cells in raster order, and whenever the first still-uncovered cell is found, it must
 * belong to some not-yet-placed clue's rectangle — branch over every clue and every
 * valid (dimensions x position) rectangle of that clue's target area/shape that
 * contains both the clue's own cell and the target cell, recurse, and backtrack on
 * failure. Because generation always starts from an actual valid partition (see
 * generator.ts), a solution is guaranteed to exist; this is only ever used to verify
 * how many exist.
 */

export const UNVERIFIED = -1

/** Valid starting-offset range (along one axis) for a run of `length` cells that must
 *  cover every position in `required`, within [0, size). */
function axisRange(size: number, length: number, required: number[]): [number, number] | null {
  const min = Math.min(...required)
  const max = Math.max(...required)
  const lo = Math.max(0, max - length + 1)
  const hi = Math.min(min, size - length)
  return lo > hi ? null : [lo, hi]
}

function firstUncovered(size: number, covered: Int32Array[]): Coord | null {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (covered[r][c] === -1) return { row: r, col: c }
    }
  }
  return null
}

function makeCovered(size: number): Int32Array[] {
  return Array.from({ length: size }, () => new Int32Array(size).fill(-1))
}

function canPlace(size: number, covered: Int32Array[], clues: PatchClue[], rect: Rect, clueIndex: number): boolean {
  if (rect.row < 0 || rect.col < 0 || rect.row + rect.height > size || rect.col + rect.width > size) return false
  for (const cell of rectCells(rect)) {
    if (covered[cell.row][cell.col] !== -1) return false
    for (let i = 0; i < clues.length; i++) {
      if (i === clueIndex) continue
      if (clues[i].cell.row === cell.row && clues[i].cell.col === cell.col) return false
    }
  }
  return true
}

export function countSolutions(size: number, clues: PatchClue[], limit = 2, nodeCap = 300_000): number {
  const covered = makeCovered(size)
  const placed = new Array<boolean>(clues.length).fill(false)
  let count = 0
  let nodes = 0
  let aborted = false

  function backtrack(): boolean {
    if (++nodes > nodeCap) {
      aborted = true
      return true
    }
    const target = firstUncovered(size, covered)
    if (!target) {
      count++
      return count >= limit
    }

    for (let i = 0; i < clues.length; i++) {
      if (placed[i]) continue
      const clue = clues[i]
      for (const [w, h] of candidateDims(clue.area, clue.shape)) {
        const rows = axisRange(size, h, [clue.cell.row, target.row])
        if (!rows) continue
        const cols = axisRange(size, w, [clue.cell.col, target.col])
        if (!cols) continue
        for (let row = rows[0]; row <= rows[1]; row++) {
          for (let col = cols[0]; col <= cols[1]; col++) {
            const rect: Rect = { row, col, width: w, height: h }
            if (!canPlace(size, covered, clues, rect, i)) continue
            for (const cell of rectCells(rect)) covered[cell.row][cell.col] = i
            placed[i] = true
            const stop = backtrack()
            for (const cell of rectCells(rect)) covered[cell.row][cell.col] = -1
            placed[i] = false
            if (stop) return true
          }
        }
      }
    }
    return false
  }

  backtrack()
  return aborted ? UNVERIFIED : count
}

/** Finds one valid partition (one rect per clue, same order), or null if none exists. */
export function solveOne(size: number, clues: PatchClue[], nodeCap = 300_000): Rect[] | null {
  const covered = makeCovered(size)
  const placed = new Array<boolean>(clues.length).fill(false)
  const rects = new Array<Rect | null>(clues.length).fill(null)
  let nodes = 0
  let found = false

  function backtrack(): boolean {
    if (++nodes > nodeCap) return true
    const target = firstUncovered(size, covered)
    if (!target) {
      found = true
      return true
    }

    for (let i = 0; i < clues.length; i++) {
      if (placed[i]) continue
      const clue = clues[i]
      for (const [w, h] of candidateDims(clue.area, clue.shape)) {
        const rows = axisRange(size, h, [clue.cell.row, target.row])
        if (!rows) continue
        const cols = axisRange(size, w, [clue.cell.col, target.col])
        if (!cols) continue
        for (let row = rows[0]; row <= rows[1]; row++) {
          for (let col = cols[0]; col <= cols[1]; col++) {
            const rect: Rect = { row, col, width: w, height: h }
            if (!canPlace(size, covered, clues, rect, i)) continue
            for (const cell of rectCells(rect)) covered[cell.row][cell.col] = i
            placed[i] = true
            rects[i] = rect
            if (backtrack()) return true
            for (const cell of rectCells(rect)) covered[cell.row][cell.col] = -1
            placed[i] = false
            rects[i] = null
          }
        }
      }
    }
    return false
  }

  backtrack()
  return found ? (rects as Rect[]) : null
}
