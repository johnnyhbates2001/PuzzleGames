/**
 * Line-solver
 * -----------
 * A nonogram is solved one line (row or column) at a time: given a line's run-length
 * clue and whatever cells are already known, enumerate every full assignment of that
 * line consistent with both, then intersect them — any cell that's filled in every
 * consistent assignment must be filled in the real solution, and likewise for empty.
 * That intersection is sound (it only ever asserts what's logically forced), so
 * running it repeatedly over every row and column until nothing changes either fully
 * determines the grid or gets stuck needing a guess.
 *
 * generator.ts uses exactly that convergence as its uniqueness proof: if alternating
 * row/column line-solves determines every cell, no other grid could be consistent with
 * every one of those forced cells, so the puzzle has exactly one solution — and,
 * usefully, one reachable by pure logic with no backtracking required.
 */

/** null = undetermined. */
export type LineCell = boolean | null

/** Every full boolean[] assignment of `length` cells satisfying run-length clue `runs`. */
export function linePlacements(length: number, runs: number[]): boolean[][] {
  if (runs.length === 0 || (runs.length === 1 && runs[0] === 0)) {
    return [new Array(length).fill(false)]
  }

  const results: boolean[][] = []
  const n = runs.length

  function backtrack(runIndex: number, start: number, cells: boolean[]) {
    if (runIndex === n) {
      results.push(cells.slice())
      return
    }
    const runLen = runs[runIndex]
    let minTrailing = 0
    for (let i = runIndex + 1; i < n; i++) minTrailing += runs[i] + 1
    const maxStart = length - runLen - minTrailing
    for (let s = start; s <= maxStart; s++) {
      const next = cells.slice()
      for (let i = s; i < s + runLen; i++) next[i] = true
      backtrack(runIndex + 1, s + runLen + 1, next)
    }
  }

  backtrack(0, 0, new Array(length).fill(false))
  return results
}

/** Cells forced by `runs` given the currently-known cells in `known` (null = unknown) —
 *  the intersection of every placement consistent with `known`. Returns `known`
 *  unchanged (no placements possible) if `known` is already contradictory. */
export function lineSolve(length: number, runs: number[], known: LineCell[]): LineCell[] {
  const consistent = linePlacements(length, runs).filter((placement) =>
    placement.every((value, i) => known[i] === null || known[i] === value),
  )
  if (consistent.length === 0) return known.slice()

  const forced: LineCell[] = new Array(length).fill(null)
  for (let i = 0; i < length; i++) {
    const first = consistent[0][i]
    if (consistent.every((placement) => placement[i] === first)) forced[i] = first
  }
  return forced
}

/** True if no placement of `runs` in a line of `length` is consistent with `known` — a
 *  line that's definitively wrong purely from its own clue, no solution needed (the
 *  nonogram equivalent of Sudoku's duplicate-digit check: free, real-time, and never a
 *  spoiler, since it can never be triggered by an under-filled line — only by marks
 *  that no completion of that line's own clue could ever satisfy). */
export function lineIsContradictory(length: number, runs: number[], known: LineCell[]): boolean {
  return linePlacements(length, runs).every(
    (placement) => !placement.every((value, i) => known[i] === null || known[i] === value),
  )
}

export interface SolveResult {
  /** Fully-determined cells where solved, otherwise the partial deduction reached
   *  before line-solving got stuck (undetermined cells default to false). */
  grid: boolean[][]
  solved: boolean
}

/** Iterates line-solving across every row and column until nothing new is deduced. */
export function solveByLogic(size: number, rowClues: number[][], colClues: number[][]): SolveResult {
  const grid: LineCell[][] = Array.from({ length: size }, () => new Array<LineCell>(size).fill(null))

  let changed = true
  while (changed) {
    changed = false

    for (let r = 0; r < size; r++) {
      const forced = lineSolve(size, rowClues[r], grid[r])
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === null && forced[c] !== null) {
          grid[r][c] = forced[c]
          changed = true
        }
      }
    }

    for (let c = 0; c < size; c++) {
      const column = grid.map((row) => row[c])
      const forced = lineSolve(size, colClues[c], column)
      for (let r = 0; r < size; r++) {
        if (grid[r][c] === null && forced[r] !== null) {
          grid[r][c] = forced[r]
          changed = true
        }
      }
    }
  }

  const solved = grid.every((row) => row.every((cell) => cell !== null))
  return { grid: grid.map((row) => row.map((cell) => cell ?? false)), solved }
}
