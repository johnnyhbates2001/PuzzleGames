import { boxIndex, SUDOKU_SIZE, type DigitGrid } from './types.ts'

/**
 * Backtracking solver/counter, using bitmasks (bit d-1 = digit d used) per row/col/box
 * and a most-constrained-cell-first (MRV) search order — plain row-major backtracking
 * is too slow to verify uniqueness on near-minimal (low-clue) puzzles; MRV keeps the
 * search tree small enough to run per-candidate-removal during generation.
 */

export const UNVERIFIED = -1

const FULL_MASK = (1 << SUDOKU_SIZE) - 1

function countBits(mask: number): number {
  let n = 0
  while (mask) {
    mask &= mask - 1
    n++
  }
  return n
}

/** Bit position (0-indexed) of the single set bit in `bit` -> 1-9 digit. */
function bitToDigit(bit: number): number {
  return 32 - Math.clz32(bit)
}

function buildMasks(grid: DigitGrid): { row: number[]; col: number[]; box: number[] } {
  const row = new Array<number>(SUDOKU_SIZE).fill(0)
  const col = new Array<number>(SUDOKU_SIZE).fill(0)
  const box = new Array<number>(SUDOKU_SIZE).fill(0)
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      const v = grid[r][c]
      if (v === 0) continue
      const bit = 1 << (v - 1)
      row[r] |= bit
      col[c] |= bit
      box[boxIndex(r, c)] |= bit
    }
  }
  return { row, col, box }
}

function emptyCells(grid: DigitGrid): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      if (grid[r][c] === 0) out.push([r, c])
    }
  }
  return out
}

/** Picks the empty cell with fewest legal candidates. Returns null if none remain (dead end reached earlier). */
function pickMostConstrained(
  remaining: Array<[number, number]>,
  row: number[],
  col: number[],
  box: number[],
): { index: number; mask: number; count: number } {
  let bestIndex = -1
  let bestMask = 0
  let bestCount = SUDOKU_SIZE + 1
  for (let i = 0; i < remaining.length; i++) {
    const [r, c] = remaining[i]
    const used = row[r] | col[c] | box[boxIndex(r, c)]
    const avail = FULL_MASK & ~used
    const count = countBits(avail)
    if (count < bestCount) {
      bestCount = count
      bestMask = avail
      bestIndex = i
      if (count === 0) break
    }
  }
  return { index: bestIndex, mask: bestMask, count: bestCount }
}

/** Counts solutions up to `limit` (default 2, i.e. "is this unique?"). Returns UNVERIFIED if the node cap aborts the search. */
export function countSolutions(grid: DigitGrid, limit = 2, nodeCap = 500_000): number {
  const { row, col, box } = buildMasks(grid)
  let count = 0
  let nodes = 0
  let aborted = false

  function backtrack(remaining: Array<[number, number]>): boolean {
    if (++nodes > nodeCap) {
      aborted = true
      return true
    }
    if (remaining.length === 0) {
      count++
      return count >= limit
    }
    const { index, mask, count: candidateCount } = pickMostConstrained(remaining, row, col, box)
    if (candidateCount === 0) return false

    const [r, c] = remaining[index]
    const next = remaining.slice(0, index).concat(remaining.slice(index + 1))
    const bi = boxIndex(r, c)

    let avail = mask
    while (avail) {
      const bit = avail & -avail
      avail ^= bit
      row[r] |= bit
      col[c] |= bit
      box[bi] |= bit
      if (backtrack(next)) return true
      row[r] &= ~bit
      col[c] &= ~bit
      box[bi] &= ~bit
    }
    return false
  }

  backtrack(emptyCells(grid))
  return aborted ? UNVERIFIED : count
}

/** Finds a single solution (or null if none exists / the node cap aborts). */
export function solveOne(grid: DigitGrid, nodeCap = 500_000): DigitGrid | null {
  const result = grid.map((r) => r.slice())
  const { row, col, box } = buildMasks(grid)
  let nodes = 0
  let found = false

  function backtrack(remaining: Array<[number, number]>): boolean {
    if (++nodes > nodeCap) return true
    if (remaining.length === 0) {
      found = true
      return true
    }
    const { index, mask, count } = pickMostConstrained(remaining, row, col, box)
    if (count === 0) return false

    const [r, c] = remaining[index]
    const next = remaining.slice(0, index).concat(remaining.slice(index + 1))
    const bi = boxIndex(r, c)

    let avail = mask
    while (avail) {
      const bit = avail & -avail
      avail ^= bit
      row[r] |= bit
      col[c] |= bit
      box[bi] |= bit
      result[r][c] = bitToDigit(bit)
      if (backtrack(next)) return true
      row[r] &= ~bit
      col[c] &= ~bit
      box[bi] &= ~bit
      result[r][c] = 0
    }
    return false
  }

  backtrack(emptyCells(grid))
  return found ? result : null
}
