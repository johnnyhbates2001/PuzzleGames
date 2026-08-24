import type { Coord } from './types'
import { lineIsContradictory, type LineCell } from './solver'

export type Mark = 'empty' | 'filled' | 'x'

function toKnown(line: Mark[]): LineCell[] {
  return line.map((mark) => (mark === 'filled' ? true : mark === 'x' ? false : null))
}

/** Rows/columns whose current marks satisfy no possible completion of their own
 *  clue — free real-time feedback that never requires (or leaks) the solution. */
export function contradictoryLines(
  size: number,
  rowClues: number[][],
  colClues: number[][],
  marks: Mark[][],
): { rows: Set<number>; cols: Set<number> } {
  const rows = new Set<number>()
  for (let r = 0; r < size; r++) {
    if (lineIsContradictory(size, rowClues[r], toKnown(marks[r]))) rows.add(r)
  }
  const cols = new Set<number>()
  for (let c = 0; c < size; c++) {
    if (lineIsContradictory(size, colClues[c], toKnown(marks.map((row) => row[c])))) cols.add(c)
  }
  return { rows, cols }
}

/** Solved once every filled/unfilled cell matches the solution — X marks (or their
 *  absence) never factor in; they're a player convenience, not part of the win state. */
export function isSolved(size: number, solution: boolean[][], marks: Mark[][]): boolean {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((marks[r][c] === 'filled') !== solution[r][c]) return false
    }
  }
  return true
}

/** Cells whose current mark disagrees with the solution — an untouched 'empty' cell is
 *  never flagged (nothing's been attempted there yet), but a wrong 'filled' cell or an
 *  'x' sitting on a cell that should be filled both are. */
export function wrongCells(size: number, solution: boolean[][], marks: Mark[][]): Coord[] {
  const wrong: Coord[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const mark = marks[r][c]
      if (mark === 'empty') continue
      if ((mark === 'filled') !== solution[r][c]) wrong.push({ row: r, col: c })
    }
  }
  return wrong
}
