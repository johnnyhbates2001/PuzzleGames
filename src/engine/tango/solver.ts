import { cloneGrid, edgeNeighbor, EMPTY, MOON, opposite, SUN, type EdgeClue, type TangoGrid, type TangoValue } from './types.ts'

/**
 * Tango solving, in two layers:
 *
 * - `logicSolve` is a human-style solver: it only ever applies deductions a player can
 *   make without guessing. Level 0 is pure propagation (edge signs, "no three in a
 *   row", "a line already holding half of one symbol takes the other everywhere
 *   else"). Level 1 adds one-step contradiction ("if this were a sun, propagation
 *   breaks — so it's a moon"), the standard next technique once propagation stalls.
 *   The generator requires every level to be fully solvable at its difficulty's level,
 *   so no puzzle ever needs trial-and-error deeper than that.
 *
 * - `countSolutions` is a plain backtracking counter (with propagation at each node),
 *   used to prove uniqueness independently of the logic solver.
 */

/** Applies every level-0 deduction until nothing changes. Mutates `grid`. Returns
 *  false on a contradiction (the grid can't be completed validly). */
export function propagate(grid: TangoGrid, edges: EdgeClue[]): boolean {
  const n = grid.length
  const half = n / 2
  let changed = true

  function set(r: number, c: number, v: TangoValue): boolean {
    const cur = grid[r][c]
    if (cur === v) return true
    if (cur !== EMPTY) return false
    grid[r][c] = v
    changed = true
    return true
  }

  while (changed) {
    changed = false

    for (const edge of edges) {
      const a = grid[edge.row][edge.col]
      const nb = edgeNeighbor(edge)
      const b = grid[nb.row][nb.col]
      if (a !== EMPTY && b !== EMPTY) {
        if ((edge.kind === 'same') !== (a === b)) return false
      } else if (a !== EMPTY) {
        if (!set(nb.row, nb.col, edge.kind === 'same' ? a : opposite(a))) return false
      } else if (b !== EMPTY) {
        if (!set(edge.row, edge.col, edge.kind === 'same' ? b : opposite(b))) return false
      }
    }

    // Rows (horizontal) then columns (vertical) — same rules, transposed access.
    for (let line = 0; line < n; line++) {
      for (const horizontal of [true, false]) {
        const at = (i: number): TangoValue => (horizontal ? grid[line][i] : grid[i][line])
        const put = (i: number, v: TangoValue): boolean => (horizontal ? set(line, i, v) : set(i, line, v))

        // No three consecutive equal symbols.
        for (let i = 0; i + 2 < n; i++) {
          const x = at(i)
          const y = at(i + 1)
          const z = at(i + 2)
          if (x !== EMPTY && x === y && y === z) return false
          if (x !== EMPTY && x === y && z === EMPTY && !put(i + 2, opposite(x))) return false
          if (y !== EMPTY && y === z && x === EMPTY && !put(i, opposite(y))) return false
          if (x !== EMPTY && x === z && y === EMPTY && !put(i + 1, opposite(x))) return false
        }

        // Exactly half of each symbol per line.
        let suns = 0
        let moons = 0
        for (let i = 0; i < n; i++) {
          const v = at(i)
          if (v === SUN) suns++
          else if (v === MOON) moons++
        }
        if (suns > half || moons > half) return false
        if (suns === half && moons < half) {
          for (let i = 0; i < n; i++) if (at(i) === EMPTY && !put(i, MOON)) return false
        } else if (moons === half && suns < half) {
          for (let i = 0; i < n; i++) if (at(i) === EMPTY && !put(i, SUN)) return false
        }
      }
    }
  }
  return true
}

function isFull(grid: TangoGrid): boolean {
  return grid.every((row) => row.every((v) => v !== EMPTY))
}

/** Solves using only deductions up to `level` (see the file comment). Returns the
 *  solved grid, or null if the solver gets stuck (or the clues are contradictory). */
export function logicSolve(givens: TangoGrid, edges: EdgeClue[], level: 0 | 1): TangoGrid | null {
  const grid = cloneGrid(givens)
  if (!propagate(grid, edges)) return null
  const n = grid.length

  while (!isFull(grid)) {
    if (level === 0) return null
    let progressed = false
    for (let r = 0; r < n && !progressed; r++) {
      for (let c = 0; c < n && !progressed; c++) {
        if (grid[r][c] !== EMPTY) continue
        for (const v of [SUN, MOON] as const) {
          const trial = cloneGrid(grid)
          trial[r][c] = v
          if (!propagate(trial, edges)) {
            grid[r][c] = opposite(v)
            if (!propagate(grid, edges)) return null
            progressed = true
            break
          }
        }
      }
    }
    if (!progressed) return null
  }
  return grid
}

/** Counts solutions up to `limit` (default 2, i.e. "is this unique?"). */
export function countSolutions(givens: TangoGrid, edges: EdgeClue[], limit = 2): number {
  let count = 0

  function search(grid: TangoGrid): boolean {
    if (!propagate(grid, edges)) return false
    const n = grid.length
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c] !== EMPTY) continue
        for (const v of [SUN, MOON] as const) {
          const next = cloneGrid(grid)
          next[r][c] = v
          if (search(next)) return true
        }
        return false
      }
    }
    count++
    return count >= limit
  }

  search(cloneGrid(givens))
  return count
}
