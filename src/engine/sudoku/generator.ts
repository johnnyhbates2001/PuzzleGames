import type { Rng } from '../rng.ts'
import { shuffle } from '../rng.ts'
import { boxIndex, SUDOKU_SIZE, type DigitGrid, type Difficulty, type SudokuLevelRecord } from './types.ts'
import { countSolutions } from './solver.ts'

/**
 * Level generation algorithm
 * ---------------------------
 * 1. generateSolvedGrid — fills an empty 9x9 grid via row-major backtracking with a
 *    shuffled digit order per cell. Unconstrained full-grid fills like this converge
 *    almost immediately in practice, so no MRV ordering is needed here (unlike the
 *    solver's uniqueness checks below, which run against near-empty/near-minimal
 *    grids where MRV is what keeps the search tractable).
 *
 * 2. removeCells — starting from a full solution, visits all 81 cells in random order
 *    and greedily blanks each one, keeping the blank only if `countSolutions` confirms
 *    the puzzle is still uniquely solvable; otherwise the digit is restored. Stops
 *    once the difficulty's given-count target is reached (or the shuffle order is
 *    exhausted). This is the standard subtractive Sudoku construction technique —
 *    unlike Queens' region-repair approach, uniqueness only ever needs to be
 *    re-verified locally around each single removal.
 *
 * 3. generateLevel retries with a fresh solution grid whenever a removal pass can't
 *    reach the difficulty's acceptable given-count range.
 */

const GIVENS_TARGET: Record<Difficulty, number> = { easy: 42, medium: 32, hard: 26 }
const GIVENS_MAX_ACCEPT: Record<Difficulty, number> = { easy: 46, medium: 36, hard: 30 }
const SOLUTION_RETRIES = 50

export function generateSolvedGrid(rng: Rng): DigitGrid {
  const grid: DigitGrid = Array.from({ length: SUDOKU_SIZE }, () => new Array<number>(SUDOKU_SIZE).fill(0))
  const rowMask = new Array<number>(SUDOKU_SIZE).fill(0)
  const colMask = new Array<number>(SUDOKU_SIZE).fill(0)
  const boxMask = new Array<number>(SUDOKU_SIZE).fill(0)

  function backtrack(pos: number): boolean {
    if (pos === SUDOKU_SIZE * SUDOKU_SIZE) return true
    const r = Math.floor(pos / SUDOKU_SIZE)
    const c = pos % SUDOKU_SIZE
    const bi = boxIndex(r, c)
    const used = rowMask[r] | colMask[c] | boxMask[bi]

    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)
    for (const d of digits) {
      const bit = 1 << (d - 1)
      if (used & bit) continue
      grid[r][c] = d
      rowMask[r] |= bit
      colMask[c] |= bit
      boxMask[bi] |= bit
      if (backtrack(pos + 1)) return true
      grid[r][c] = 0
      rowMask[r] &= ~bit
      colMask[c] &= ~bit
      boxMask[bi] &= ~bit
    }
    return false
  }

  backtrack(0)
  return grid
}

export function removeCells(solution: DigitGrid, targetGivens: number, rng: Rng): { puzzle: DigitGrid; givens: number } {
  const puzzle = solution.map((row) => row.slice())
  const positions = shuffle(
    Array.from({ length: SUDOKU_SIZE * SUDOKU_SIZE }, (_, i) => ({ row: Math.floor(i / SUDOKU_SIZE), col: i % SUDOKU_SIZE })),
    rng,
  )
  let givens = SUDOKU_SIZE * SUDOKU_SIZE

  for (const { row, col } of positions) {
    if (givens <= targetGivens) break
    const backup = puzzle[row][col]
    puzzle[row][col] = 0
    if (countSolutions(puzzle, 2) === 1) {
      givens--
    } else {
      puzzle[row][col] = backup
    }
  }

  return { puzzle, givens }
}

export function generateLevel(difficulty: Difficulty, rng: Rng): SudokuLevelRecord | null {
  const target = GIVENS_TARGET[difficulty]
  const maxAccept = GIVENS_MAX_ACCEPT[difficulty]

  for (let attempt = 0; attempt < SOLUTION_RETRIES; attempt++) {
    const solution = generateSolvedGrid(rng)
    const { puzzle, givens } = removeCells(solution, target, rng)
    if (givens <= maxAccept) {
      return { id: makeId(), difficulty, puzzle, solution }
    }
  }

  return null
}

function makeId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `lvl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
