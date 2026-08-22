import type { Coord, RegionGrid } from './types.ts'

/**
 * Backtracking solver for the Queens rules: exactly one queen per row, column and
 * colored region, with a LOCAL 8-neighbor "no touching" rule (not classic N-Queens
 * full-diagonal exclusion).
 *
 * Because adjacency is local, a queen placed at row r can only ever be 8-adjacent to
 * a queen in row r-1 (any earlier row is geometrically too far away). So the
 * backtracker only needs to remember the previous row's chosen column, not the full
 * set of placed queens, to check the adjacency rule.
 */

/** Sentinel returned by countSolutions when the search was aborted by the node cap. */
export const UNVERIFIED = -1

export function countSolutions(regions: RegionGrid, limit = 2, nodeCap = 200_000): number {
  const n = regions.length
  const usedCols = new Array<boolean>(n).fill(false)
  const usedRegions = new Array<boolean>(n).fill(false)
  let count = 0
  let nodes = 0
  let aborted = false

  function backtrack(row: number, prevCol: number | null): boolean {
    if (++nodes > nodeCap) {
      aborted = true
      return true
    }
    if (row === n) {
      count++
      return count >= limit
    }
    for (let col = 0; col < n; col++) {
      if (usedCols[col]) continue
      if (prevCol !== null && Math.abs(col - prevCol) <= 1) continue
      const region = regions[row][col]
      if (usedRegions[region]) continue
      usedCols[col] = true
      usedRegions[region] = true
      const stop = backtrack(row + 1, col)
      usedCols[col] = false
      usedRegions[region] = false
      if (stop) return true
    }
    return false
  }

  backtrack(0, null)
  return aborted ? UNVERIFIED : count
}

function coordsEqual(a: Coord[], b: Coord[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i].row !== b[i].row || a[i].col !== b[i].col) return false
  }
  return true
}

/**
 * Searches for a solution distinct from `target` (which must itself be a valid
 * solution for `regions`). Returns null if `target` is the unique solution.
 * Used by the generator's region-repair loop to find the next alternate solution
 * to eliminate, and by generator.test.ts to assert final uniqueness directly.
 */
export function findAlternateSolution(regions: RegionGrid, target: Coord[], nodeCap = 300_000): Coord[] | null {
  const n = regions.length
  const usedCols = new Array<boolean>(n).fill(false)
  const usedRegions = new Array<boolean>(n).fill(false)
  const chosenCol = new Array<number>(n).fill(-1)
  let nodes = 0
  let alt: Coord[] | null = null

  function backtrack(row: number, prevCol: number | null): boolean {
    if (++nodes > nodeCap) return true
    if (row === n) {
      const candidate = chosenCol.map((col, r) => ({ row: r, col }))
      if (!coordsEqual(candidate, target)) {
        alt = candidate
        return true
      }
      return false // this is `target` itself — keep searching other branches
    }
    for (let col = 0; col < n; col++) {
      if (usedCols[col]) continue
      if (prevCol !== null && Math.abs(col - prevCol) <= 1) continue
      const region = regions[row][col]
      if (usedRegions[region]) continue
      usedCols[col] = true
      usedRegions[region] = true
      chosenCol[row] = col
      const stop = backtrack(row + 1, col)
      usedCols[col] = false
      usedRegions[region] = false
      if (stop) return true
    }
    return false
  }

  backtrack(0, null)
  return alt
}

/** Finds a single solution (or null if none exists). Used internally by the generator. */
export function solveOne(regions: RegionGrid, nodeCap = 200_000): Coord[] | null {
  const n = regions.length
  const usedCols = new Array<boolean>(n).fill(false)
  const usedRegions = new Array<boolean>(n).fill(false)
  const chosenCol = new Array<number>(n).fill(-1)
  let nodes = 0
  let found = false

  function backtrack(row: number, prevCol: number | null): boolean {
    if (++nodes > nodeCap) return true
    if (row === n) {
      found = true
      return true
    }
    for (let col = 0; col < n; col++) {
      if (usedCols[col]) continue
      if (prevCol !== null && Math.abs(col - prevCol) <= 1) continue
      const region = regions[row][col]
      if (usedRegions[region]) continue
      usedCols[col] = true
      usedRegions[region] = true
      chosenCol[row] = col
      if (backtrack(row + 1, col)) return true
      usedCols[col] = false
      usedRegions[region] = false
    }
    return false
  }

  backtrack(0, null)
  if (!found) return null
  return chosenCol.map((col, row) => ({ row, col }))
}
