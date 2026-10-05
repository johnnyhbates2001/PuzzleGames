import { boxIndex } from '../sudoku/types.ts'
import { UNVERIFIED } from '../sudoku/solver.ts'
import { cageIndexGrid, type Cage, type DigitGrid } from './types.ts'

export { UNVERIFIED }

/**
 * Killer Sudoku backtracking solver/counter. Same bitmask + most-constrained-cell-first
 * approach as the classic Sudoku solver (engine/sudoku/solver.ts), with one extra
 * filter per cell: its digit must belong to some set of distinct, not-yet-used digits
 * that can still fill the rest of its cage to exactly the cage's sum. That filter
 * comes from a precomputed table of every digit subset by (size, sum), which is what
 * keeps uniqueness checks on clue-less boards fast enough to run on-device for the
 * Daily Challenge.
 */

const FULL_MASK = 0x1ff

/** COMBOS[k][s] — every 9-bit digit mask with k digits summing to s. */
const COMBOS: number[][][] = Array.from({ length: 10 }, () => Array.from({ length: 46 }, () => [] as number[]))
for (let mask = 1; mask <= FULL_MASK; mask++) {
  let k = 0
  let s = 0
  for (let d = 1; d <= 9; d++) {
    if (mask & (1 << (d - 1))) {
      k++
      s += d
    }
  }
  COMBOS[k][s].push(mask)
}

function countBits(mask: number): number {
  let n = 0
  while (mask) {
    mask &= mask - 1
    n++
  }
  return n
}

function bitToDigit(bit: number): number {
  return 32 - Math.clz32(bit)
}

export interface KillerSearchResult {
  /** Solutions found (up to the limit), or UNVERIFIED if the node cap aborted. */
  count: number
  solutions: DigitGrid[]
}

/** Finds up to `limit` solutions. The solutions themselves are returned so the
 *  generator can see exactly where two of them disagree. */
export function searchSolutions(puzzle: DigitGrid, cages: Cage[], limit = 2, nodeCap = 300_000): KillerSearchResult {
  const grid = puzzle.map((r) => r.slice())
  const cageOf = cageIndexGrid(cages)
  const row = new Array<number>(9).fill(0)
  const col = new Array<number>(9).fill(0)
  const box = new Array<number>(9).fill(0)
  const cageUsed = new Array<number>(cages.length).fill(0)
  const cageSum = new Array<number>(cages.length).fill(0)
  const cageEmpty = cages.map((c) => c.cells.length)
  const remaining: Array<[number, number]> = []

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c]
      if (v === 0) {
        remaining.push([r, c])
        continue
      }
      const bit = 1 << (v - 1)
      const ci = cageOf[r][c]
      if ((row[r] | col[c] | box[boxIndex(r, c)] | cageUsed[ci]) & bit) return { count: 0, solutions: [] }
      row[r] |= bit
      col[c] |= bit
      box[boxIndex(r, c)] |= bit
      cageUsed[ci] |= bit
      cageSum[ci] += v
      cageEmpty[ci]--
    }
  }

  const cageCells = cages.map((cage) => cage.cells.map(({ row: r, col: c }) => [r, c] as const))

  /** Union of every digit combination that can still finish cage `ci`: distinct digits
   *  not yet used in the cage, summing to what's left, where every digit fits at least
   *  one of the cage's empty cells and every empty cell can take at least one digit. */
  function cageAllowed(ci: number): number {
    const k = cageEmpty[ci]
    const rest = cages[ci].sum - cageSum[ci]
    if (rest < 0 || rest > 45) return 0
    const available = FULL_MASK & ~cageUsed[ci]
    const bases: number[] = []
    let reach = 0
    for (const [r, c] of cageCells[ci]) {
      if (grid[r][c] !== 0) continue
      const base = FULL_MASK & ~(row[r] | col[c] | box[boxIndex(r, c)])
      bases.push(base)
      reach |= base
    }
    let union = 0
    for (const m of COMBOS[k][rest]) {
      if (m & ~available || m & ~reach) continue
      if (bases.some((b) => (b & m) === 0)) continue
      union |= m
    }
    return union
  }

  const solutions: DigitGrid[] = []
  let nodes = 0
  let aborted = false

  function backtrack(): boolean {
    if (++nodes > nodeCap) {
      aborted = true
      return true
    }
    if (remaining.length === 0) {
      solutions.push(grid.map((r) => r.slice()))
      return solutions.length >= limit
    }

    const allowed = new Array<number>(cages.length)
    for (let ci = 0; ci < cages.length; ci++) {
      if (cageEmpty[ci] === 0) continue
      allowed[ci] = cageAllowed(ci)
      if (allowed[ci] === 0) return false
    }

    let bestIndex = -1
    let bestMask = 0
    let bestCount = 10
    for (let i = 0; i < remaining.length; i++) {
      const [r, c] = remaining[i]
      const mask = FULL_MASK & ~(row[r] | col[c] | box[boxIndex(r, c)]) & allowed[cageOf[r][c]]
      const count = countBits(mask)
      if (count < bestCount) {
        bestCount = count
        bestMask = mask
        bestIndex = i
        if (count <= 1) break
      }
    }
    if (bestCount === 0) return false

    const [r, c] = remaining[bestIndex]
    remaining[bestIndex] = remaining[remaining.length - 1]
    remaining.pop()
    const bi = boxIndex(r, c)
    const ci = cageOf[r][c]

    let avail = bestMask
    let done = false
    while (avail) {
      const bit = avail & -avail
      avail ^= bit
      const d = bitToDigit(bit)
      row[r] |= bit
      col[c] |= bit
      box[bi] |= bit
      cageUsed[ci] |= bit
      cageSum[ci] += d
      cageEmpty[ci]--
      grid[r][c] = d
      done = backtrack()
      grid[r][c] = 0
      row[r] &= ~bit
      col[c] &= ~bit
      box[bi] &= ~bit
      cageUsed[ci] &= ~bit
      cageSum[ci] -= d
      cageEmpty[ci]++
      if (done) break
    }

    remaining.push([r, c])
    const last = remaining.length - 1
    ;[remaining[bestIndex], remaining[last]] = [remaining[last], remaining[bestIndex]]
    return done
  }

  backtrack()
  return { count: aborted ? UNVERIFIED : solutions.length, solutions }
}

/** Counts solutions up to `limit` (default 2, i.e. "is this unique?"). Returns
 *  UNVERIFIED if the node cap aborts the search. */
export function countSolutions(puzzle: DigitGrid, cages: Cage[], limit = 2, nodeCap?: number): number {
  return searchSolutions(puzzle, cages, limit, nodeCap).count
}
