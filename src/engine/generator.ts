import type { Coord, Difficulty, LevelRecord, RegionGrid } from './types.ts'
import { DIFFICULTY_SIZE, coordKey } from './types.ts'
import { findAlternateSolution } from './solver.ts'
import { solveByLogic } from './logicSolver.ts'
import { type Rng, shuffle } from './rng.ts'

/**
 * Level generation algorithm
 * ---------------------------
 * 1. generateSolutionSeed — regions don't exist yet, so the only constraints available
 *    are: one queen per row, one per column, and the LOCAL adjacency rule (a queen in
 *    row r can only conflict with row r-1, since rows further apart are never
 *    8-adjacent). This is a randomized backtracking search over row/col permutations
 *    (candidate columns shuffled per row) — NOT classic N-Queens (no full-diagonal
 *    exclusion). It truly backtracks (not just greedy-with-restart), so it always
 *    finds a solution if one exists, while still producing a different random result
 *    each call because of the shuffled candidate order.
 *
 * 2. growRegions — grows exactly N contiguous regions outward from the N seed cells
 *    via randomized simultaneous flood-fill, using 4-directional (edge) adjacency for
 *    region *shape* (the standard "colored regions" convention — distinct from the
 *    8-directional adjacency used for the queen-touching *rule*). This produces a
 *    valid starting partition (every region contiguous, exactly one seed per region)
 *    but, empirically, an almost always NON-unique one — a purely random region shape
 *    rarely happens to pin the solution down to exactly one placement (measured: at
 *    n=7 a random partition typically has 10-50+ solutions).
 *
 * 3. repairToUnique — the step that actually earns uniqueness. Since region-growing
 *    only ever reassigns non-seed cells, the seeded target solution is trivially still
 *    valid no matter how the boundaries are redrawn (its queens' rows/cols/regions
 *    never change), so the whole problem reduces to a local search over region
 *    boundaries that eliminates every OTHER solution while never touching seed cells:
 *      - find any solution distinct from the target (`findAlternateSolution`)
 *      - pick one of the rows where it disagrees with the target, and move that
 *        alternate solution's queen cell into a neighboring region (a boundary flip),
 *        provided its old region stays contiguous without it — this directly breaks
 *        that specific alternate solution by giving its queen a region shared with
 *        another of its own queens
 *      - if every candidate row is blocked (contiguity would break), apply a random
 *        "kick" move elsewhere on the board to reshape the landscape and try again
 *      - repeat until no alternate solution can be found (unique) or the iteration
 *        budget is exhausted (give up this seed/region attempt and retry from scratch)
 *    This is a standard min-conflicts-style local search; measured empirically to
 *    converge within a couple hundred iterations for boards up to 10x10.
 *
 * 4. generateLevel ties it together, retrying with a fresh seed (and fresh region
 *    growth) whenever repair fails to converge within its iteration budget. It also
 *    rejects (and retries) any board that repair does converge on if solveByLogic
 *    (logicSolver.ts) can't fully solve it — repair only ever proves the solution is
 *    unique, not that a human can reach it without guessing, so this is a second,
 *    independent filter on top of uniqueness.
 */

const REPAIR_MAX_ITERS = 300
const SEED_RETRIES = 200

function neighbors4(r: number, c: number, n: number): Coord[] {
  const out: Coord[] = []
  if (r > 0) out.push({ row: r - 1, col: c })
  if (r < n - 1) out.push({ row: r + 1, col: c })
  if (c > 0) out.push({ row: r, col: c - 1 })
  if (c < n - 1) out.push({ row: r, col: c + 1 })
  return out
}

export function generateSolutionSeed(n: number, rng: Rng): Coord[] | null {
  const usedCols = new Array<boolean>(n).fill(false)
  const cols = new Array<number>(n).fill(-1)

  function backtrack(row: number): boolean {
    if (row === n) return true
    const candidates = shuffle(
      Array.from({ length: n }, (_, c) => c).filter(
        (c) => !usedCols[c] && (row === 0 || Math.abs(c - cols[row - 1]) >= 2),
      ),
      rng,
    )
    for (const c of candidates) {
      usedCols[c] = true
      cols[row] = c
      if (backtrack(row + 1)) return true
      usedCols[c] = false
    }
    return false
  }

  if (!backtrack(0)) return null
  return cols.map((col, row) => ({ row, col }))
}

export function growRegions(seeds: Coord[], n: number, rng: Rng): RegionGrid {
  const regions: RegionGrid = Array.from({ length: n }, () => new Array<number>(n).fill(-1))
  const frontiers: Coord[][] = seeds.map(() => [])

  const claim = (regionId: number, cell: Coord) => {
    regions[cell.row][cell.col] = regionId
    for (const nb of neighbors4(cell.row, cell.col, n)) {
      if (regions[nb.row][nb.col] === -1) frontiers[regionId].push(nb)
    }
  }

  seeds.forEach((seed, i) => claim(i, seed))
  let remaining = n * n - seeds.length

  while (remaining > 0) {
    let progressed = false
    for (const i of shuffle(Array.from({ length: seeds.length }, (_, k) => k), rng)) {
      frontiers[i] = frontiers[i].filter((c) => regions[c.row][c.col] === -1)
      if (frontiers[i].length === 0) continue
      const idx = Math.floor(rng() * frontiers[i].length)
      const cell = frontiers[i].splice(idx, 1)[0]
      if (regions[cell.row][cell.col] !== -1) continue
      claim(i, cell)
      remaining--
      progressed = true
    }
    if (!progressed) break
  }

  // Safety net: mop up any cells stranded by exhausted frontiers by repeatedly
  // claiming unassigned cells that are 4-adjacent to an already-assigned region.
  while (remaining > 0) {
    let assignedThisPass = false
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (regions[r][c] !== -1) continue
        for (const nb of neighbors4(r, c, n)) {
          const owner = regions[nb.row][nb.col]
          if (owner !== -1) {
            regions[r][c] = owner
            remaining--
            assignedThisPass = true
            break
          }
        }
      }
    }
    if (!assignedThisPass) {
      throw new Error('unreachable: a fully-connected grid cannot strand unassigned cells')
    }
  }

  return regions
}

/** Whether regionId's remaining cells stay 4-connected after hypothetically removing `removed`. */
function stillContiguousWithoutCell(regions: RegionGrid, n: number, regionId: number, removed: Coord): boolean {
  let start: Coord | null = null
  let total = 0
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (regions[r][c] === regionId && !(r === removed.row && c === removed.col)) {
        total++
        if (!start) start = { row: r, col: c }
      }
    }
  }
  if (!start) return true // region would become empty; can't happen (seed cell is never moved)
  const visited = new Set<string>([coordKey(start)])
  const stack: Coord[] = [start]
  while (stack.length > 0) {
    const cur = stack.pop()!
    for (const nb of neighbors4(cur.row, cur.col, n)) {
      if (regions[nb.row][nb.col] !== regionId) continue
      if (nb.row === removed.row && nb.col === removed.col) continue
      const key = coordKey(nb)
      if (visited.has(key)) continue
      visited.add(key)
      stack.push(nb)
    }
  }
  return visited.size === total
}

/** Moves cell `q` into a random 4-adjacent region, if doing so keeps its old region contiguous. Mutates `regions`. */
function tryMoveCell(regions: RegionGrid, n: number, q: Coord, seedKeys: Set<string>, rng: Rng): boolean {
  if (seedKeys.has(coordKey(q))) return false // seed cells must never change region
  const currentRegion = regions[q.row][q.col]
  const neighborRegionIds = shuffle(
    [...new Set(neighbors4(q.row, q.col, n).map((nb) => regions[nb.row][nb.col]).filter((id) => id !== currentRegion))],
    rng,
  )
  for (const targetRegion of neighborRegionIds) {
    if (stillContiguousWithoutCell(regions, n, currentRegion, q)) {
      regions[q.row][q.col] = targetRegion
      return true
    }
  }
  return false
}

/** Local search: mutates `regions` in place, eliminating alternate solutions until only `target` remains. */
function repairToUnique(regions: RegionGrid, target: Coord[], n: number, rng: Rng, maxIters: number): boolean {
  const seedKeys = new Set(target.map(coordKey))

  for (let iter = 0; iter < maxIters; iter++) {
    const alt = findAlternateSolution(regions, target)
    if (!alt) return true // no alternate solution found -> unique

    const diffRows = shuffle(
      Array.from({ length: n }, (_, r) => r).filter((r) => alt[r].col !== target[r].col),
      rng,
    )
    let moved = false
    for (const row of diffRows) {
      if (tryMoveCell(regions, n, alt[row], seedKeys, rng)) {
        moved = true
        break
      }
    }
    if (moved) continue

    // Every direct repair move was blocked by contiguity — kick a random cell
    // elsewhere to reshape the boundary landscape and keep searching.
    let kicked = false
    for (let attempt = 0; attempt < 30 && !kicked; attempt++) {
      const cell = { row: Math.floor(rng() * n), col: Math.floor(rng() * n) }
      kicked = tryMoveCell(regions, n, cell, seedKeys, rng)
    }
    if (!kicked) return false
  }
  return false
}

export function generateLevel(difficulty: Difficulty, rng: Rng): LevelRecord | null {
  const n = DIFFICULTY_SIZE[difficulty]

  for (let seedTry = 0; seedTry < SEED_RETRIES; seedTry++) {
    const seed = generateSolutionSeed(n, rng)
    if (!seed) continue

    const regions = growRegions(seed, n, rng)
    if (repairToUnique(regions, seed, n, rng, REPAIR_MAX_ITERS) && solveByLogic(regions).solved) {
      return {
        id: makeId(),
        difficulty,
        size: n,
        regions,
        solution: seed,
      }
    }
  }

  return null
}

function makeId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `lvl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
