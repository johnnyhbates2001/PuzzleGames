import type { Coord, RegionGrid } from './types.ts'
import { coordKey } from './types.ts'
import { conflicts } from './rules.ts'

/**
 * Checks a fixed, already-placed set of queens (the live board) — O(k^2) over the
 * placed queens (k <= 10), cheap enough to recompute on every move. Distinct from
 * the solver's backtracking search, which explores the whole space.
 */
export function getConflicts(queens: Coord[], regions: RegionGrid): Set<string> {
  const bad = new Set<string>()
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      if (conflicts(queens[i], queens[j], regions)) {
        bad.add(coordKey(queens[i]))
        bad.add(coordKey(queens[j]))
      }
    }
  }
  return bad
}

export function isSolved(queens: Coord[], size: number, regions: RegionGrid): boolean {
  if (queens.length !== size) return false
  if (getConflicts(queens, regions).size > 0) return false
  const rows = new Set(queens.map((q) => q.row))
  const cols = new Set(queens.map((q) => q.col))
  const regionIds = new Set(queens.map((q) => regions[q.row][q.col]))
  return rows.size === size && cols.size === size && regionIds.size === size
}
