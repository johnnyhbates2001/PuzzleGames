import { coordKey, edgeKey, gridNeighbors, type Coord } from './types.ts'

/**
 * Counts Hamiltonian paths on a size x size grid graph that start at
 * `checkpoints[0]`, visit every remaining checkpoint in order, never cross an edge in
 * `walls`, and visit every cell exactly once — up to `limit` (default 2, i.e. "is this
 * unique?"). Two prunes make this tractable at generation time:
 *  - checkpoint-order pruning: a checkpoint cell is only a legal next step when it's
 *    the next one due: this collapses most of the branching immediately on sparse
 *    (hard-difficulty) checkpoint sets.
 *  - connectivity pruning: after each tentative step, flood-fill the remaining
 *    unvisited cells from the new position — if they aren't all reachable, the branch
 *    can never complete a Hamiltonian path, so it's cut immediately rather than
 *    explored to exhaustion.
 */

export const UNVERIFIED = -1

function neighbors(size: number, walls: Set<string>, cell: Coord): Coord[] {
  return gridNeighbors(size, cell).filter((nb) => !walls.has(edgeKey(cell, nb)))
}

/** Warnsdorff ordering: try the neighbor with the fewest onward (unvisited) options
 *  first — finds both solutions and dead ends far faster than a fixed iteration order. */
function orderedNeighbors(size: number, walls: Set<string>, visited: Set<string>, cell: Coord): Coord[] {
  return neighbors(size, walls, cell)
    .map((nb) => ({ nb, deg: neighbors(size, walls, nb).filter((n2) => !visited.has(coordKey(n2))).length }))
    .sort((a, b) => a.deg - b.deg)
    .map(({ nb }) => nb)
}

export function countHamiltonianPaths(
  size: number,
  checkpoints: Coord[],
  walls: Set<string>,
  limit = 2,
  nodeCap = 2_000_000,
): number {
  const total = size * size
  const cpIndex = new Map<string, number>()
  checkpoints.forEach((c, i) => cpIndex.set(coordKey(c), i))

  const visited = new Set<string>()
  let count = 0
  let nodes = 0
  let aborted = false

  // `from` is assumed already marked visited by the caller — this counts OTHER
  // unvisited cells reachable from it (flood-filling out from its neighbors), NOT
  // including `from` itself.
  function reachableCount(from: Coord): number {
    const seen = new Set<string>()
    const stack: Coord[] = []
    for (const nb of neighbors(size, walls, from)) {
      const key = coordKey(nb)
      if (visited.has(key) || seen.has(key)) continue
      seen.add(key)
      stack.push(nb)
    }
    while (stack.length > 0) {
      const cur = stack.pop()!
      for (const nb of neighbors(size, walls, cur)) {
        const key = coordKey(nb)
        if (visited.has(key) || seen.has(key)) continue
        seen.add(key)
        stack.push(nb)
      }
    }
    return seen.size
  }

  function backtrack(last: Coord, nextCp: number, filled: number): boolean {
    if (++nodes > nodeCap) {
      aborted = true
      return true
    }
    if (filled === total) {
      count++
      return count >= limit
    }
    for (const nb of orderedNeighbors(size, walls, visited, last)) {
      const key = coordKey(nb)
      if (visited.has(key)) continue
      const cp = cpIndex.get(key)
      if (cp !== undefined && cp !== nextCp) continue

      visited.add(key)
      const remaining = total - filled - 1
      if (remaining === 0 || reachableCount(nb) === remaining) {
        if (backtrack(nb, cp !== undefined ? nextCp + 1 : nextCp, filled + 1)) {
          visited.delete(key)
          return true
        }
      }
      visited.delete(key)
    }
    return false
  }

  const start = checkpoints[0]
  visited.add(coordKey(start))
  backtrack(start, 1, 1)
  return aborted ? UNVERIFIED : count
}

/** Finds one Hamiltonian path satisfying the checkpoints/walls, or null if none exists. */
export function solveOne(size: number, checkpoints: Coord[], walls: Set<string>, nodeCap = 2_000_000): Coord[] | null {
  const total = size * size
  const cpIndex = new Map<string, number>()
  checkpoints.forEach((c, i) => cpIndex.set(coordKey(c), i))

  const visited = new Set<string>()
  const path: Coord[] = []
  let nodes = 0
  let found = false

  // `from` is assumed already marked visited by the caller — this counts OTHER
  // unvisited cells reachable from it (flood-filling out from its neighbors), NOT
  // including `from` itself.
  function reachableCount(from: Coord): number {
    const seen = new Set<string>()
    const stack: Coord[] = []
    for (const nb of neighbors(size, walls, from)) {
      const key = coordKey(nb)
      if (visited.has(key) || seen.has(key)) continue
      seen.add(key)
      stack.push(nb)
    }
    while (stack.length > 0) {
      const cur = stack.pop()!
      for (const nb of neighbors(size, walls, cur)) {
        const key = coordKey(nb)
        if (visited.has(key) || seen.has(key)) continue
        seen.add(key)
        stack.push(nb)
      }
    }
    return seen.size
  }

  function backtrack(last: Coord, nextCp: number, filled: number): boolean {
    if (++nodes > nodeCap) return true
    if (filled === total) {
      found = true
      return true
    }
    for (const nb of orderedNeighbors(size, walls, visited, last)) {
      const key = coordKey(nb)
      if (visited.has(key)) continue
      const cp = cpIndex.get(key)
      if (cp !== undefined && cp !== nextCp) continue

      visited.add(key)
      path.push(nb)
      const remaining = total - filled - 1
      if (remaining === 0 || reachableCount(nb) === remaining) {
        if (backtrack(nb, cp !== undefined ? nextCp + 1 : nextCp, filled + 1)) return true
      }
      path.pop()
      visited.delete(key)
    }
    return false
  }

  const start = checkpoints[0]
  visited.add(coordKey(start))
  path.push(start)
  backtrack(start, 1, 1)
  return found ? path : null
}
