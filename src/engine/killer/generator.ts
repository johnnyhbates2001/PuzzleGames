import type { Rng } from '../rng.ts'
import { shuffle } from '../rng.ts'
import { generateSolvedGrid } from '../sudoku/generator.ts'
import { searchSolutions } from './solver.ts'
import type { Cage, Coord, Difficulty, DigitGrid, KillerLevelRecord } from './types.ts'

/**
 * Level generation algorithm
 * ---------------------------
 * 1. Solution — a random full Sudoku grid, from the classic generator.
 *
 * 2. generateCages — partitions the grid into cages by repeatedly seeding a cage at the
 *    unassigned cell with the fewest unassigned neighbours (so leftovers don't get
 *    stranded as single cells) and growing it into random adjacent cells, never taking
 *    a cell whose digit is already in the cage. Target sizes come from the difficulty:
 *    small cages pin digits down quickly, bigger ones leave more combinations open.
 *
 * 3. Uniqueness repair — searches for two solutions. While a second one exists, the
 *    puzzle gets a given at a cell where the two disagree (which rules that second
 *    solution out). If the difficulty's given budget runs out first, the whole level is
 *    discarded and generateLevel retries with a fresh grid and cage layout.
 *
 * Unlike classic Sudoku there's no subtractive "remove givens" pass — cages are the clue,
 * and most boards come out unique with zero or a handful of givens.
 */

interface DifficultyConfig {
  /** Weighted pool of target cage sizes — one is drawn per cage. */
  sizes: number[]
  maxGivens: number
}

const CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { sizes: [2, 2, 2, 3, 3], maxGivens: 8 },
  medium: { sizes: [2, 2, 3, 3, 3, 4], maxGivens: 4 },
  hard: { sizes: [2, 3, 3, 3, 4, 4, 5], maxGivens: 2 },
}

const LEVEL_RETRIES = 20
/** Bounds each uniqueness search so a pathological layout fails fast (and gets
 *  retried) instead of stalling the Daily Challenge on a slow phone. */
const NODE_CAP = 60_000

const NEIGHBOR_STEPS: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

export function generateCages(solution: DigitGrid, sizes: number[], rng: Rng): Cage[] {
  const owner = Array.from({ length: 9 }, () => new Array<number>(9).fill(-1))
  const cages: Coord[][] = []

  function freeNeighbors(r: number, c: number): Coord[] {
    const out: Coord[] = []
    for (const [dr, dc] of NEIGHBOR_STEPS) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && owner[nr][nc] === -1) out.push({ row: nr, col: nc })
    }
    return out
  }

  for (;;) {
    let seed: Coord | null = null
    let seedFree = 5
    for (const { row, col } of shuffle(
      Array.from({ length: 81 }, (_, i) => ({ row: Math.floor(i / 9), col: i % 9 })),
      rng,
    )) {
      if (owner[row][col] !== -1) continue
      const free = freeNeighbors(row, col).length
      if (free < seedFree) {
        seed = { row, col }
        seedFree = free
      }
    }
    if (!seed) break

    const index = cages.length
    const cells = [seed]
    const digits = new Set([solution[seed.row][seed.col]])
    owner[seed.row][seed.col] = index
    const target = sizes[Math.floor(rng() * sizes.length)]

    while (cells.length < target) {
      const options = cells
        .flatMap((cell) => freeNeighbors(cell.row, cell.col))
        .filter((cell) => !digits.has(solution[cell.row][cell.col]))
      if (options.length === 0) break
      const next = options[Math.floor(rng() * options.length)]
      owner[next.row][next.col] = index
      cells.push(next)
      digits.add(solution[next.row][next.col])
    }
    cages.push(cells)
  }

  return cages.map((cells) => ({
    cells: cells.sort((a, b) => a.row - b.row || a.col - b.col),
    sum: cells.reduce((s, { row, col }) => s + solution[row][col], 0),
  }))
}

export function generateLevel(difficulty: Difficulty, rng: Rng): KillerLevelRecord | null {
  const { sizes, maxGivens } = CONFIG[difficulty]

  for (let attempt = 0; attempt < LEVEL_RETRIES; attempt++) {
    const solution = generateSolvedGrid(rng)
    const cages = generateCages(solution, sizes, rng)
    const puzzle: DigitGrid = Array.from({ length: 9 }, () => new Array<number>(9).fill(0))
    let givens = 0

    for (;;) {
      const { count, solutions } = searchSolutions(puzzle, cages, 2, NODE_CAP)
      if (count === 1) return { id: makeId(), difficulty, puzzle, solution, cages }
      if (count < 0 || givens >= maxGivens) break
      // count === 2: add a given where the second solution disagrees with the real one
      // (solutions[0] may itself be the "other" one, so compare both to `solution`).
      const other = solutions.find((s) => s.some((row, r) => row.some((v, c) => v !== solution[r][c])))!
      const diffs: Coord[] = []
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) if (other[r][c] !== solution[r][c]) diffs.push({ row: r, col: c })
      }
      const pick = diffs[Math.floor(rng() * diffs.length)]
      puzzle[pick.row][pick.col] = solution[pick.row][pick.col]
      givens++
    }
  }

  return null
}

function makeId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `lvl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
