import type { Rng } from '../rng.ts'
import { shuffle } from '../rng.ts'
import { logicSolve } from './solver.ts'
import {
  cloneGrid,
  edgeNeighbor,
  emptyGrid,
  EMPTY,
  MOON,
  SUN,
  TANGO_SIZE,
  type Difficulty,
  type EdgeClue,
  type TangoGrid,
  type TangoLevelRecord,
  type TangoValue,
} from './types.ts'

/**
 * Level generation algorithm
 * ---------------------------
 * 1. generateSolvedGrid — fills an empty grid row-major via backtracking with a
 *    shuffled symbol order per cell, rejecting any placement that makes three in a
 *    row/column or puts more than half of one symbol in a line.
 *
 * 2. Clue pool — every cell of the solution as a given, plus a random sample of the
 *    border signs ('=' / '×') between adjacent cells, read off the solution.
 *
 * 3. Subtractive pruning — visits the givens (then the signs) in random order and drops
 *    each clue only if `logicSolve` (at the difficulty's deduction level) can still
 *    finish the board. Givens go first so the signs end up doing most of the work, as
 *    on LinkedIn's boards.
 *    Logic deductions are always forced moves, so a board the logic solver completes
 *    has exactly one solution — this one check guarantees both uniqueness and "never
 *    needs a guess". Givens stop being removed at the difficulty's floor, which is what
 *    keeps easy boards generous.
 */

interface DifficultyConfig {
  logicLevel: 0 | 1
  /** Givens are never pruned below this count. */
  minGivens: number
  /** How many border signs are sampled into the pool before pruning. */
  edgePool: number
}

const CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { logicLevel: 0, minGivens: 10, edgePool: 8 },
  medium: { logicLevel: 1, minGivens: 4, edgePool: 10 },
  hard: { logicLevel: 1, minGivens: 6, edgePool: 16 },
}


export function generateSolvedGrid(size: number, rng: Rng): TangoGrid {
  const grid = emptyGrid(size)
  const half = size / 2
  const rowCount = Array.from({ length: size }, () => [0, 0, 0])
  const colCount = Array.from({ length: size }, () => [0, 0, 0])

  function fits(r: number, c: number, v: TangoValue): boolean {
    if (rowCount[r][v] >= half || colCount[c][v] >= half) return false
    if (c >= 2 && grid[r][c - 1] === v && grid[r][c - 2] === v) return false
    if (r >= 2 && grid[r - 1][c] === v && grid[r - 2][c] === v) return false
    return true
  }

  function backtrack(pos: number): boolean {
    if (pos === size * size) return true
    const r = Math.floor(pos / size)
    const c = pos % size
    for (const v of shuffle([SUN, MOON] as TangoValue[], rng)) {
      if (!fits(r, c, v)) continue
      grid[r][c] = v
      rowCount[r][v]++
      colCount[c][v]++
      if (backtrack(pos + 1)) return true
      grid[r][c] = EMPTY
      rowCount[r][v]--
      colCount[c][v]--
    }
    return false
  }

  backtrack(0)
  return grid
}

function allEdges(solution: TangoGrid): EdgeClue[] {
  const n = solution.length
  const edges: EdgeClue[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      for (const dir of ['right', 'down'] as const) {
        const edge: EdgeClue = { row: r, col: c, dir, kind: 'same' }
        const nb = edgeNeighbor(edge)
        if (nb.row >= n || nb.col >= n) continue
        edge.kind = solution[r][c] === solution[nb.row][nb.col] ? 'same' : 'diff'
        edges.push(edge)
      }
    }
  }
  return edges
}

function solvesTo(givens: TangoGrid, edges: EdgeClue[], level: 0 | 1, solution: TangoGrid): boolean {
  const solved = logicSolve(givens, edges, level)
  return solved !== null && solved.every((row, r) => row.every((v, c) => v === solution[r][c]))
}

type PoolEntry = { kind: 'given'; row: number; col: number } | { kind: 'edge'; edge: EdgeClue }

export function generateLevel(difficulty: Difficulty, rng: Rng): TangoLevelRecord | null {
  const size = TANGO_SIZE[difficulty]
  const { logicLevel, minGivens, edgePool } = CONFIG[difficulty]
  const solution = generateSolvedGrid(size, rng)

  const givens = cloneGrid(solution)
  let edges = shuffle(allEdges(solution), rng).slice(0, edgePool)
  let givenCount = size * size

  // Every board keeps at least one sign per row on average — a sign-less Tango board is
  // just a plain binary puzzle and loses the game's defining clue type.
  const minEdges = size
  const pool: PoolEntry[] = [
    ...shuffle(
      Array.from({ length: size * size }, (_, i): PoolEntry => ({ kind: 'given', row: Math.floor(i / size), col: i % size })),
      rng,
    ),
    ...edges.map((edge): PoolEntry => ({ kind: 'edge', edge })),
  ]

  for (const entry of pool) {
    if (entry.kind === 'given') {
      if (givenCount <= minGivens) continue
      const backup = givens[entry.row][entry.col]
      givens[entry.row][entry.col] = EMPTY
      if (solvesTo(givens, edges, logicLevel, solution)) givenCount--
      else givens[entry.row][entry.col] = backup
    } else {
      if (edges.length <= minEdges) continue
      const without = edges.filter((e) => e !== entry.edge)
      if (solvesTo(givens, without, logicLevel, solution)) edges = without
    }
  }

  if (!solvesTo(givens, edges, logicLevel, solution)) return null
  // Row-major order so the stored record (and the bank JSON) reads predictably.
  edges.sort((a, b) => a.row - b.row || a.col - b.col || a.dir.localeCompare(b.dir))
  return { id: makeId(), difficulty, size, givens, edges, solution }
}

function makeId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `lvl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
