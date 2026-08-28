import type { Coord, RegionGrid } from './types.ts'

/**
 * Human-style logic solver
 * -------------------------
 * countSolutions/findAlternateSolution (solver.ts) prove a puzzle has exactly one
 * solution, but a brute-force backtracker finds it the way a computer would, not the
 * way a person would — a uniquely-solvable board can still force a human to guess and
 * backtrack by hand. This solver instead applies the deduction techniques a player
 * actually uses, and only ever asserts a placement that's logically forced:
 *
 *  - naked single: a row, column, or region with exactly one remaining candidate cell
 *    must hold its queen there.
 *  - placing a queen eliminates the rest of its row, column, region, and 8-neighbors
 *    (the standard "no touching" rule) from candidacy.
 *  - pointing: if a region's remaining candidates all lie in one row (or column), no
 *    *other* region can hold the queen for that row/column, so their candidates there
 *    are eliminated.
 *  - claiming: if a row's (or column's) remaining candidates all belong to one region,
 *    that region's queen must land in this row/column, so its candidates elsewhere are
 *    eliminated.
 *
 * These four rules are iterated to a fixpoint (mirroring nonogram/solver.ts's
 * row/column line-solve loop). If every queen ends up placed, the board is solvable by
 * pure deduction with no guessing; generator.ts uses that as an additional generation
 * filter on top of raw uniqueness.
 */

export interface LogicSolveResult {
  queens: Coord[]
  solved: boolean
}

export function solveByLogic(regions: RegionGrid): LogicSolveResult {
  const n = regions.length
  const candidates: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(true))
  const rowSolved = new Array<boolean>(n).fill(false)
  const colSolved = new Array<boolean>(n).fill(false)
  const regionSolved = new Array<boolean>(n).fill(false)
  const queens: Coord[] = []

  function eliminate(r: number, c: number): boolean {
    if (!candidates[r][c]) return false
    candidates[r][c] = false
    return true
  }

  function place(r: number, c: number) {
    queens.push({ row: r, col: c })
    rowSolved[r] = true
    colSolved[c] = true
    const g = regions[r][c]
    regionSolved[g] = true

    for (let cc = 0; cc < n; cc++) if (cc !== c) eliminate(r, cc)
    for (let rr = 0; rr < n; rr++) if (rr !== r) eliminate(rr, c)
    for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++) if (regions[rr][cc] === g && (rr !== r || cc !== c)) eliminate(rr, cc)
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const rr = r + dr
        const cc = c + dc
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) eliminate(rr, cc)
      }
    }
  }

  function candidateCellsInRegion(g: number): Coord[] {
    const cells: Coord[] = []
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (regions[r][c] === g && candidates[r][c]) cells.push({ row: r, col: c })
    return cells
  }

  let changed = true
  while (changed) {
    changed = false

    for (let r = 0; r < n; r++) {
      if (rowSolved[r]) continue
      const cols: number[] = []
      for (let c = 0; c < n; c++) if (candidates[r][c]) cols.push(c)
      if (cols.length === 1) {
        place(r, cols[0])
        changed = true
      }
    }
    if (changed) continue

    for (let c = 0; c < n; c++) {
      if (colSolved[c]) continue
      const rows: number[] = []
      for (let r = 0; r < n; r++) if (candidates[r][c]) rows.push(r)
      if (rows.length === 1) {
        place(rows[0], c)
        changed = true
      }
    }
    if (changed) continue

    for (let g = 0; g < n; g++) {
      if (regionSolved[g]) continue
      const cells = candidateCellsInRegion(g)
      if (cells.length === 1) {
        place(cells[0].row, cells[0].col)
        changed = true
      }
    }
    if (changed) continue

    // Pointing: a region confined to a single row/column locks out every other
    // region from that row/column.
    for (let g = 0; g < n; g++) {
      if (regionSolved[g]) continue
      const cells = candidateCellsInRegion(g)
      if (cells.length === 0) continue

      const rows = new Set(cells.map((cell) => cell.row))
      if (rows.size === 1) {
        const r = cells[0].row
        for (let c = 0; c < n; c++) if (regions[r][c] !== g && eliminate(r, c)) changed = true
      }

      const cols = new Set(cells.map((cell) => cell.col))
      if (cols.size === 1) {
        const c = cells[0].col
        for (let r = 0; r < n; r++) if (regions[r][c] !== g && eliminate(r, c)) changed = true
      }
    }
    if (changed) continue

    // Claiming: a row/column whose remaining candidates all belong to one region
    // means that region's queen is confined to this row/column, so its candidates
    // elsewhere are eliminated.
    for (let r = 0; r < n; r++) {
      if (rowSolved[r]) continue
      const regionIds = new Set<number>()
      for (let c = 0; c < n; c++) if (candidates[r][c]) regionIds.add(regions[r][c])
      if (regionIds.size === 1) {
        const [g] = regionIds
        for (let rr = 0; rr < n; rr++) {
          if (rr === r) continue
          for (let cc = 0; cc < n; cc++) if (regions[rr][cc] === g && eliminate(rr, cc)) changed = true
        }
      }
    }
    if (changed) continue

    for (let c = 0; c < n; c++) {
      if (colSolved[c]) continue
      const regionIds = new Set<number>()
      for (let r = 0; r < n; r++) if (candidates[r][c]) regionIds.add(regions[r][c])
      if (regionIds.size === 1) {
        const [g] = regionIds
        for (let cc = 0; cc < n; cc++) {
          if (cc === c) continue
          for (let rr = 0; rr < n; rr++) if (regions[rr][cc] === g && eliminate(rr, cc)) changed = true
        }
      }
    }
  }

  return { queens, solved: queens.length === n }
}
