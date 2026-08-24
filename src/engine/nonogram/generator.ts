import type { Rng } from '../rng.ts'
import { NONOGRAM_SIZE, cluesFromSolution, type Difficulty, type NonogramLevelRecord } from './types.ts'
import { solveByLogic } from './solver.ts'

/**
 * Level generation algorithm
 * ---------------------------
 * 1. Fill a size x size grid with independent random cells at a fixed density.
 * 2. Derive that grid's row/column clues, then run the line-solver (solveByLogic) to
 *    see whether those clues alone determine the grid back exactly — most random
 *    grids don't (nonograms need "nice" structure to be logic-solvable), so on
 *    failure this simply retries with a fresh random grid.
 *
 * Retrying like this — rather than constructing a guaranteed-solvable grid directly —
 * mirrors Patches' generator (a random layout, verified, discarded and retried on
 * failure), and gets every generated puzzle a free proof of both uniqueness and pure
 * logical solvability (see solver.ts) for roughly the same reason: the check is cheap
 * enough at these grid sizes to just brute-force over attempts.
 */

const DENSITY = 0.55
const GENERATE_RETRIES = 4000

function generateSolutionGrid(size: number, rng: Rng): boolean[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => rng() < DENSITY))
}

function gridsEqual(a: boolean[][], b: boolean[][]): boolean {
  return a.every((row, r) => row.every((cell, c) => cell === b[r][c]))
}

export function generateLevel(difficulty: Difficulty, rng: Rng): NonogramLevelRecord | null {
  const size = NONOGRAM_SIZE[difficulty]

  for (let attempt = 0; attempt < GENERATE_RETRIES; attempt++) {
    const solution = generateSolutionGrid(size, rng)
    const { rowClues, colClues } = cluesFromSolution(solution)
    const result = solveByLogic(size, rowClues, colClues)
    if (result.solved && gridsEqual(result.grid, solution)) {
      return { id: makeId(), difficulty, size, solution, rowClues, colClues }
    }
  }

  return null
}

function makeId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `lvl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
