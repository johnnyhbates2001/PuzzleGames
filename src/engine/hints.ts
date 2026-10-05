import type { Coord, LevelRecord } from './types.ts'

/**
 * "Show next step" hints for Queens
 * ----------------------------------
 * Finds the next move a person could make by pure logic from the player's current
 * board, using the same four rules as logicSolver.ts (which every generated level is
 * already verified against, so a step always exists on a mistake-free board):
 *
 *  - a row, column or region with only one square left must hold its queen there;
 *  - pointing: a region whose remaining squares all sit in one row/column will take
 *    that row/column, so every other region's squares there can be crossed out;
 *  - claiming: a row/column whose remaining squares all belong to one region forces
 *    that region's queen into it, so the region's other squares can be crossed out.
 *
 * A square is "remaining" unless it's attacked by a correctly-placed queen or the
 * player has crossed it out. Mistakes — a wrong queen, or an X on a queen's square —
 * are pointed out first, since anything deduced on top of them would be wrong too.
 */

export type QueensHint =
  | { kind: 'mistake'; cell: Coord; message: string; focus: Coord[] }
  | { kind: 'queen'; cell: Coord; message: string; focus: Coord[] }
  | { kind: 'cross'; cells: Coord[]; message: string; focus: Coord[] }

export interface QueensBoardView {
  queen: boolean
  /** Crossed out by the player or by auto-X. */
  x: boolean
}

export function findQueensHint(level: LevelRecord, board: QueensBoardView[][]): QueensHint | null {
  const { size: n, regions, solution } = level
  const isSolutionCell = (r: number, c: number) => solution[r]?.col === c

  // 1. Mistakes.
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c].queen && !isSolutionCell(r, c)) {
        const clash = findClash(level, board, r, c)
        return {
          kind: 'mistake',
          cell: { row: r, col: c },
          message: clash
            ? `This queen is wrong — it ${clash.reason}. Remove it and look again.`
            : "This queen isn't part of the solution. Remove it and look again.",
          focus: clash ? [clash.cell] : [],
        }
      }
    }
  }
  for (let r = 0; r < n; r++) {
    const c = solution[r].col
    if (!board[r][c].queen && board[r][c].x) {
      return { kind: 'mistake', cell: { row: r, col: c }, message: 'This X is a mistake — a queen belongs here.', focus: [] }
    }
  }

  // Remaining candidates.
  const rowDone = new Array<boolean>(n).fill(false)
  const colDone = new Array<boolean>(n).fill(false)
  const regionDone = new Array<boolean>(n).fill(false)
  const cand: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(true))
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!board[r][c].queen) continue
      rowDone[r] = true
      colDone[c] = true
      regionDone[regions[r][c]] = true
      for (let rr = 0; rr < n; rr++) {
        for (let cc = 0; cc < n; cc++) {
          const attacked = rr === r || cc === c || regions[rr][cc] === regions[r][c] || (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1)
          if (attacked) cand[rr][cc] = false
        }
      }
    }
  }
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (board[r][c].x) cand[r][c] = false

  const rowCells = (r: number) => Array.from({ length: n }, (_, c) => ({ row: r, col: c }))
  const colCells = (c: number) => Array.from({ length: n }, (_, r) => ({ row: r, col: c }))
  const regionCells = (g: number) => {
    const out: Coord[] = []
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (regions[r][c] === g) out.push({ row: r, col: c })
    return out
  }
  const open = (cells: Coord[]) => cells.filter((p) => cand[p.row][p.col])

  // 2. Singles — regions first, since they're the easiest to spot.
  for (let g = 0; g < n; g++) {
    if (regionDone[g]) continue
    const cells = regionCells(g)
    const left = open(cells)
    if (left.length === 1) {
      return {
        kind: 'queen',
        cell: left[0],
        message: 'This region has only one square left that could hold a queen — every other square in it is ruled out — so its queen goes here.',
        focus: cells,
      }
    }
  }
  for (let r = 0; r < n; r++) {
    if (rowDone[r]) continue
    const left = open(rowCells(r))
    if (left.length === 1) {
      return {
        kind: 'queen',
        cell: left[0],
        message: `Row ${r + 1} has only one square left that could hold a queen, so its queen goes here.`,
        focus: rowCells(r),
      }
    }
  }
  for (let c = 0; c < n; c++) {
    if (colDone[c]) continue
    const left = open(colCells(c))
    if (left.length === 1) {
      return {
        kind: 'queen',
        cell: left[0],
        message: `Column ${c + 1} has only one square left that could hold a queen, so its queen goes here.`,
        focus: colCells(c),
      }
    }
  }

  // 3. Pointing: a region confined to one row/column.
  for (let g = 0; g < n; g++) {
    if (regionDone[g]) continue
    const left = open(regionCells(g))
    if (left.length === 0) continue
    for (const axis of ['row', 'column'] as const) {
      const key = axis === 'row' ? left[0].row : left[0].col
      if (!left.every((p) => (axis === 'row' ? p.row : p.col) === key)) continue
      const line = axis === 'row' ? rowCells(key) : colCells(key)
      const cross = open(line).filter((p) => regions[p.row][p.col] !== g)
      if (cross.length === 0) continue
      return {
        kind: 'cross',
        cells: cross,
        message: `Every square left in this region is in ${axis} ${key + 1}, so its queen will take ${axis} ${key + 1}. No other region can use that ${axis}, so these squares can be crossed out.`,
        focus: left,
      }
    }
  }

  // 4. Claiming: a row/column whose remaining squares all belong to one region.
  for (const axis of ['row', 'column'] as const) {
    for (let i = 0; i < n; i++) {
      if (axis === 'row' ? rowDone[i] : colDone[i]) continue
      const left = open(axis === 'row' ? rowCells(i) : colCells(i))
      if (left.length === 0) continue
      const g = regions[left[0].row][left[0].col]
      if (!left.every((p) => regions[p.row][p.col] === g)) continue
      const cross = open(regionCells(g)).filter((p) => (axis === 'row' ? p.row : p.col) !== i)
      if (cross.length === 0) continue
      return {
        kind: 'cross',
        cells: cross,
        message: `Every square left in ${axis} ${i + 1} belongs to the same region, so that region's queen has to be in ${axis} ${i + 1}. The region's other squares can be crossed out.`,
        focus: left,
      }
    }
  }

  // 5. Shouldn't happen on a verified level — reveal the next queen, honestly.
  for (let r = 0; r < n; r++) {
    if (rowDone[r]) continue
    return {
      kind: 'queen',
      cell: solution[r],
      message: "There's no simple deduction left from here, so here's the queen for this row.",
      focus: [],
    }
  }
  return null
}

function findClash(level: LevelRecord, board: QueensBoardView[][], r: number, c: number): { cell: Coord; reason: string } | null {
  const { size: n, regions } = level
  for (let rr = 0; rr < n; rr++) {
    for (let cc = 0; cc < n; cc++) {
      if ((rr === r && cc === c) || !board[rr][cc].queen) continue
      if (rr === r) return { cell: { row: rr, col: cc }, reason: 'shares a row with another queen' }
      if (cc === c) return { cell: { row: rr, col: cc }, reason: 'shares a column with another queen' }
      if (regions[rr][cc] === regions[r][c]) return { cell: { row: rr, col: cc }, reason: 'shares a region with another queen' }
      if (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1) return { cell: { row: rr, col: cc }, reason: 'touches another queen' }
    }
  }
  return null
}
