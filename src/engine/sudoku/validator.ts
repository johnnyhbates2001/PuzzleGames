import { BOX_SIZE, SUDOKU_SIZE, type Coord, type DigitGrid } from './types.ts'

function markDuplicates(board: DigitGrid, cells: Coord[], bad: Set<string>): void {
  const seen = new Map<number, Coord[]>()
  for (const { row, col } of cells) {
    const v = board[row][col]
    if (v === 0) continue
    const group = seen.get(v)
    if (group) group.push({ row, col })
    else seen.set(v, [{ row, col }])
  }
  for (const group of seen.values()) {
    if (group.length < 2) continue
    for (const { row, col } of group) bad.add(`${row},${col}`)
  }
}

/** Cell keys ("row,col") that currently violate a row/col/box uniqueness constraint. */
export function getConflicts(board: DigitGrid): Set<string> {
  const bad = new Set<string>()

  for (let r = 0; r < SUDOKU_SIZE; r++) {
    markDuplicates(
      board,
      Array.from({ length: SUDOKU_SIZE }, (_, c) => ({ row: r, col: c })),
      bad,
    )
  }
  for (let c = 0; c < SUDOKU_SIZE; c++) {
    markDuplicates(
      board,
      Array.from({ length: SUDOKU_SIZE }, (_, r) => ({ row: r, col: c })),
      bad,
    )
  }
  for (let br = 0; br < BOX_SIZE; br++) {
    for (let bc = 0; bc < BOX_SIZE; bc++) {
      const cells: Coord[] = []
      for (let r = br * BOX_SIZE; r < br * BOX_SIZE + BOX_SIZE; r++) {
        for (let c = bc * BOX_SIZE; c < bc * BOX_SIZE + BOX_SIZE; c++) cells.push({ row: r, col: c })
      }
      markDuplicates(board, cells, bad)
    }
  }

  return bad
}

export function isSolved(board: DigitGrid): boolean {
  for (const row of board) {
    if (row.some((v) => v === 0)) return false
  }
  return getConflicts(board).size === 0
}
