import { describe, expect, it } from 'vitest'
import { addExclusions, findSudokuHint } from './hints'
import type { SudokuLevelRecord } from './types'
import type { KillerLevelRecord } from '../killer/types'
import sudokuHard from '../../data/banks/sudoku-hard.json'
import killerMedium from '../../data/banks/killer-medium.json'
import killerHard from '../../data/banks/killer-hard.json'

/** Follows "Show next step" from the starting grid to a solved board: placing each
 *  suggested digit and remembering each elimination, as the page does. */
function playOut(level: SudokuLevelRecord & { cages?: KillerLevelRecord['cages'] }): { places: number; eliminations: number } {
  const values = level.puzzle.map((r) => r.slice())
  let excluded: number[][] | undefined
  let places = 0
  let eliminations = 0
  for (let guard = 0; guard < 2000; guard++) {
    const hint = findSudokuHint({ values, solution: level.solution, cages: level.cages, excluded })
    if (!hint) break
    expect(hint.kind).not.toBe('mistake')
    // One step at a time — never a chain of eliminations folded into a placement.
    expect(hint.message).not.toMatch(/after a few/i)
    if (hint.kind === 'eliminate') {
      expect(hint.cells.length).toBeGreaterThan(0)
      // Never rules out the real answer.
      for (const p of hint.cells) expect(hint.digits).not.toContain(level.solution[p.row][p.col])
      excluded = addExclusions(excluded, hint)
      eliminations++
    } else if (hint.kind === 'place') {
      expect(hint.digit).toBe(level.solution[hint.cell.row][hint.cell.col])
      values[hint.cell.row][hint.cell.col] = hint.digit
      places++
    }
  }
  expect(values).toEqual(level.solution)
  return { places, eliminations }
}

describe('findSudokuHint', () => {
  it('only ever suggests correct digits, through to a solved classic board', () => {
    for (const level of (sudokuHard as SudokuLevelRecord[]).slice(0, 5)) playOut(level)
  })

  it('only ever suggests correct digits, through to a solved Killer board', () => {
    for (const level of (killerMedium as KillerLevelRecord[]).slice(0, 5)) playOut(level)
  })

  it('gives an elimination as the next step when no digit can be placed yet', () => {
    const totals = (killerHard as KillerLevelRecord[]).slice(0, 3).map(playOut)
    expect(totals.every((t) => t.eliminations > 0)).toBe(true)
  })

  it('builds on eliminations it has already taught', () => {
    const level = (killerHard as KillerLevelRecord[])[0]
    const values = level.puzzle.map((r) => r.slice())
    let first = findSudokuHint({ values, solution: level.solution, cages: level.cages })
    while (first && first.kind === 'place') {
      values[first.cell.row][first.cell.col] = first.digit
      first = findSudokuHint({ values, solution: level.solution, cages: level.cages })
    }
    expect(first?.kind).toBe('eliminate')
    if (first?.kind !== 'eliminate') return
    const next = findSudokuHint({ values, solution: level.solution, cages: level.cages, excluded: addExclusions(undefined, first) })
    expect(next?.message).not.toBe(first.message)
  })

  it('names a duplicate digit as the mistake', () => {
    const level = (sudokuHard as SudokuLevelRecord[])[0]
    const values = level.puzzle.map((r) => r.slice())
    const givenInRow0 = values[0].find((v) => v !== 0)!
    const emptyCol = values[0].findIndex((v) => v === 0)
    values[0][emptyCol] = givenInRow0
    const hint = findSudokuHint({ values, solution: level.solution })
    expect(hint).toMatchObject({ kind: 'mistake', cell: { row: 0, col: emptyCol } })
    expect(hint!.message).toContain(`already a ${givenInRow0} in this row`)
  })

  it('explains a single-square cage by its sum', () => {
    const solution = (killerMedium as KillerLevelRecord[])[0].solution
    const values = Array.from({ length: 9 }, () => new Array<number>(9).fill(0))
    const hint = findSudokuHint({ values, solution, cages: [{ cells: [{ row: 4, col: 4 }], sum: solution[4][4] }] })
    expect(hint).toMatchObject({ kind: 'place', cell: { row: 4, col: 4 }, digit: solution[4][4] })
    expect(hint!.message).toContain('cage on its own')
  })
})
