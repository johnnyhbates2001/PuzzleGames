import type { Rng } from '../rng.ts'
import { shuffle } from '../rng.ts'
import { coordKey, edgeKey, gridNeighbors, ZIP_SIZE, type Coord, type Difficulty, type ZipLevelRecord } from './types.ts'
import { countHamiltonianPaths, UNVERIFIED } from './solver.ts'

/**
 * Level generation algorithm
 * ---------------------------
 * 1. generateHamiltonianPath — randomized backtracking with two standard speedups:
 *    Warnsdorff ordering (try the neighbor with the fewest onward options first — the
 *    same heuristic used for Knight's Tour generation) and connectivity pruning (after
 *    each tentative step, flood-fill the remaining unvisited cells; if they're not all
 *    still reachable, the branch can never complete and is cut immediately). Together
 *    these make full-grid Hamiltonian path construction fast and reliable up to the
 *    grid sizes used here.
 *
 * 2. pickCheckpoints — samples an evenly-spread subset of the path's cells (always
 *    including the first and last) as the numbered waypoints; difficulty controls how
 *    many are shown — fewer checkpoints means more of the path is left for the player
 *    to infer.
 *
 * 3. addWallsForUniqueness — checkpoints alone are almost never enough to pin the path
 *    down to one solution, so this adds walls on edges the true path never uses, one
 *    at a time in random order, re-verifying uniqueness after each addition. Adding a
 *    wall can only ever remove candidate paths (never add one, and never removes the
 *    true solution, since it's only ever chosen from edges that solution doesn't use),
 *    so this converges monotonically — the same "start under-constrained, add
 *    constraints until unique" shape as Zip's real puzzle construction, just the
 *    mirror image of Sudoku's "start fully constrained, remove until still unique".
 *
 * 4. generateLevel retries with a fresh path whenever wall-adding can't reach
 *    uniqueness within a modest wall budget (keeps puzzles visually uncluttered).
 */

const CHECKPOINT_COUNT: Record<Difficulty, number> = { easy: 9, medium: 8, hard: 6 }
// Real Zip puzzles lean on quite a few wall segments to pin down a unique path from a
// sparse checkpoint set (observed up to ~12 on a 6x6) — an early, much stingier budget
// here made hard's sparse checkpoints fail to converge almost every attempt.
const MAX_WALLS: Record<Difficulty, number> = { easy: 8, medium: 12, hard: 14 }
const PATH_RETRIES = 60

export function generateHamiltonianPath(size: number, rng: Rng, nodeCap = 500_000): Coord[] | null {
  const total = size * size
  const visited = new Set<string>()
  const path: Coord[] = []
  let nodes = 0
  let aborted = false

  // `from` is assumed already marked visited by the caller — this counts OTHER
  // unvisited cells reachable from it (flood-filling out from its neighbors), NOT
  // including `from` itself.
  function reachableCount(from: Coord): number {
    const seen = new Set<string>()
    const stack: Coord[] = []
    for (const nb of gridNeighbors(size, from)) {
      const key = coordKey(nb)
      if (visited.has(key) || seen.has(key)) continue
      seen.add(key)
      stack.push(nb)
    }
    while (stack.length > 0) {
      const cur = stack.pop()!
      for (const nb of gridNeighbors(size, cur)) {
        const key = coordKey(nb)
        if (visited.has(key) || seen.has(key)) continue
        seen.add(key)
        stack.push(nb)
      }
    }
    return seen.size
  }

  function degree(cell: Coord): number {
    return gridNeighbors(size, cell).filter((nb) => !visited.has(coordKey(nb))).length
  }

  function backtrack(last: Coord, filled: number): boolean {
    if (++nodes > nodeCap) {
      aborted = true
      return true
    }
    if (filled === total) return true

    const candidates = shuffle(
      gridNeighbors(size, last).filter((nb) => !visited.has(coordKey(nb))),
      rng,
    )
      .map((nb) => ({ nb, deg: degree(nb) }))
      .sort((a, b) => a.deg - b.deg)

    for (const { nb } of candidates) {
      const key = coordKey(nb)
      visited.add(key)
      path.push(nb)
      const remaining = total - filled - 1
      if (remaining === 0 || reachableCount(nb) === remaining) {
        if (backtrack(nb, filled + 1)) return true
      }
      path.pop()
      visited.delete(key)
    }
    return false
  }

  // Checkerboard-color the grid: a Hamiltonian path over an odd number of cells must
  // start (and end) on the majority color, so starting anywhere else is provably
  // impossible before any search even begins. Restricting to (row+col) even is always
  // safe: it's the majority (or tied) color for every grid size, odd or even.
  const evenCells: Coord[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r + c) % 2 === 0) evenCells.push({ row: r, col: c })
    }
  }
  const start = evenCells[Math.floor(rng() * evenCells.length)]
  visited.add(coordKey(start))
  path.push(start)
  const completed = backtrack(start, 1)
  return !aborted && completed && path.length === total ? path : null
}

/** Samples an evenly-spread subset of `path`'s cells (always including both ends). No
 *  randomness needed here — the path itself is already fresh/random per generation. */
export function pickCheckpoints(path: Coord[], count: number): Coord[] {
  const total = path.length
  const n = Math.max(2, Math.min(count, total))
  if (n === 2) return [path[0], path[total - 1]]

  const indices = new Set<number>([0, total - 1])
  const step = (total - 1) / (n - 1)
  for (let i = 1; i < n - 1; i++) {
    let target = Math.round(step * i)
    while (indices.has(target)) target = (target + 1) % total
    indices.add(target)
  }

  return [...indices].sort((a, b) => a - b).map((i) => path[i])
}

export function addWallsForUniqueness(
  size: number,
  checkpoints: Coord[],
  path: Coord[],
  rng: Rng,
  maxWalls: number,
): Set<string> | null {
  const usedEdges = new Set<string>()
  for (let i = 0; i < path.length - 1; i++) usedEdges.add(edgeKey(path[i], path[i + 1]))

  const seenEdge = new Set<string>()
  const candidateEdges: string[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (const nb of gridNeighbors(size, { row: r, col: c })) {
        const key = edgeKey({ row: r, col: c }, nb)
        if (seenEdge.has(key) || usedEdges.has(key)) continue
        seenEdge.add(key)
        candidateEdges.push(key)
      }
    }
  }

  // Bounded well below countHamiltonianPaths' own default: this runs many times per
  // wall candidate, so a cheaper "couldn't verify in time, skip this candidate" beats
  // letting one unlucky candidate eat the whole generation budget.
  const VERIFY_NODE_CAP = 150_000

  const walls = new Set<string>()
  if (countHamiltonianPaths(size, checkpoints, walls, 2, VERIFY_NODE_CAP) === 1) return walls

  for (const edge of shuffle(candidateEdges, rng)) {
    if (walls.size >= maxWalls) break
    walls.add(edge)
    const count = countHamiltonianPaths(size, checkpoints, walls, 2, VERIFY_NODE_CAP)
    if (count === 1) return walls
    if (count === UNVERIFIED) walls.delete(edge) // couldn't verify it helped — don't keep an unproven wall
  }
  return null
}

export function generateLevel(difficulty: Difficulty, rng: Rng): ZipLevelRecord | null {
  const size = ZIP_SIZE[difficulty]
  const checkpointCount = CHECKPOINT_COUNT[difficulty]
  const maxWalls = MAX_WALLS[difficulty]

  for (let attempt = 0; attempt < PATH_RETRIES; attempt++) {
    const path = generateHamiltonianPath(size, rng)
    if (!path) continue
    const checkpoints = pickCheckpoints(path, checkpointCount)
    const walls = addWallsForUniqueness(size, checkpoints, path, rng, maxWalls)
    if (!walls) continue
    return { id: makeId(), difficulty, size, checkpoints, walls: [...walls], solution: path }
  }
  return null
}

function makeId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `lvl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
