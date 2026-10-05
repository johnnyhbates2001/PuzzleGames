import { lineSolve, type LineCell } from './solver.ts'
import type { Coord, NonogramLevelRecord } from './types.ts'
import type { Mark } from './validator.ts'

/**
 * "Show next step" hints for Nonogram
 * ------------------------------------
 * A nonogram step is always "this line, given its clue and what's already marked,
 * forces these squares" (the same line-solving every level is verified against — see
 * solver.ts). This picks the line that forces the most new filled squares (falling back
 * to lines that only force crosses), and words the reason by case: an empty line, a
 * line whose runs are all placed, a clue that fills the line exactly, or the general
 * "every way to fit it covers these squares" overlap. Mistakes come first.
 */

export type NonogramHint =
  | { kind: 'mistake'; cell: Coord; message: string; focus: Coord[] }
  | { kind: 'mark'; cells: { row: number; col: number; mark: Mark }[]; message: string; focus: Coord[] }

function known(mark: Mark): LineCell {
  return mark === 'filled' ? true : mark === 'x' ? false : null
}

export function findNonogramHint(level: NonogramLevelRecord, grid: Mark[][]): NonogramHint | null {
  const { size, solution, rowClues, colClues } = level

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const mark = grid[r][c]
      if (mark === 'filled' && !solution[r][c]) {
        return { kind: 'mistake', cell: { row: r, col: c }, message: "This square shouldn't be filled — clear it and look again.", focus: [] }
      }
      if (mark === 'x' && solution[r][c]) {
        return { kind: 'mistake', cell: { row: r, col: c }, message: 'This X is a mistake — this square should be filled.', focus: [] }
      }
    }
  }

  type Candidate = { name: string; clue: number[]; cells: Coord[]; marks: LineCell[]; forced: LineCell[] }
  const candidates: Candidate[] = []
  for (let i = 0; i < size; i++) {
    for (const axis of ['row', 'column'] as const) {
      const cells = Array.from({ length: size }, (_, k) => (axis === 'row' ? { row: i, col: k } : { row: k, col: i }))
      const marks = cells.map((p) => known(grid[p.row][p.col]))
      const clue = axis === 'row' ? rowClues[i] : colClues[i]
      const forced = lineSolve(size, clue, marks)
      if (forced.some((v, k) => v !== null && marks[k] === null)) candidates.push({ name: `${axis} ${i + 1}`, clue, cells, marks, forced })
    }
  }
  if (candidates.length === 0) return null

  const newFills = (cand: Candidate) => cand.forced.filter((v, k) => v === true && cand.marks[k] === null).length
  const newTotal = (cand: Candidate) => cand.forced.filter((v, k) => v !== null && cand.marks[k] === null).length
  candidates.sort((a, b) => newFills(b) - newFills(a) || newTotal(b) - newTotal(a))
  const best = candidates[0]

  const cells = best.cells
    .map((p, k) => ({ ...p, value: best.forced[k], was: best.marks[k] }))
    .filter((p) => p.value !== null && p.was === null)
    .map((p) => ({ row: p.row, col: p.col, mark: (p.value ? 'filled' : 'x') as Mark }))
  const fills = cells.filter((p) => p.mark === 'filled').length
  const crosses = cells.length - fills

  const Name = best.name.charAt(0).toUpperCase() + best.name.slice(1)
  const clueText = best.clue.join(' ')
  const runTotal = best.clue.reduce((a, b) => a + b, 0)
  const filledNow = best.marks.filter((v) => v === true).length
  const nothingMarked = best.marks.every((v) => v === null)
  const what =
    fills && crosses
      ? `${fills === 1 ? 'this square is' : `these ${fills} squares are`} always filled and ${crosses === 1 ? 'the one marked with an X is' : `the ${crosses} marked with an X are`} always empty`
      : fills
        ? `${fills === 1 ? 'this square is' : `these ${fills} squares are`} always filled`
        : `${crosses === 1 ? 'this square is' : `these ${crosses} squares are`} always empty`

  let message: string
  if (best.clue.length === 1 && best.clue[0] === 0) {
    message = `${Name}'s clue is 0, so nothing in it is filled — it can all be crossed out.`
  } else if (fills === 0 && filledNow === runTotal) {
    message = `${Name} already has all its filled squares (${clueText}), so the rest of it is empty.`
  } else if (nothingMarked && runTotal + best.clue.length - 1 === cells.length + best.marks.filter((v) => v !== null).length) {
    message =
      best.clue.length === 1
        ? `${Name}'s clue (${clueText}) is as long as the whole line, so every square in it is filled.`
        : `${Name}'s clue (${clueText}) plus a one-square gap between each run adds up to exactly the whole line, so there's only one way to fill it.`
  } else {
    message = `There are only so many ways to fit ${best.name}'s clue (${clueText})${nothingMarked ? '' : ' around what’s already marked'} — and in every one of them, ${what}.`
  }

  return { kind: 'mark', cells, message, focus: best.cells }
}
