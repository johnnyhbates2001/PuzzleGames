import { describe, expect, it } from 'vitest'
import { findSudokuHint } from './hints'
import type { SudokuLevelRecord } from './types'
import type { KillerLevelRecord } from '../killer/types'
import sudokuHard from '../../data/banks/sudoku-hard.json'
import killerMedium from '../../data/banks/killer-medium.json'

function playOut(level: SudokuLevelRecord & { cages?: KillerLevelRecord['cages'] }): number {
  const values = level.puzzle.map((r) => r.slice())
  let steps = 0
  for (let hint = findSudokuHint({ values, solution: level.solution, cages: level.cages }); hint; hint = findSudokuHint({ values, solution: level.solution, cages: level.cages })) {
    expect(hint.kind).toBe('place')
    if (hint.kind !== 'place') break
    expect(hint.digit).toBe(level.solution[hint.cell.row][hint.cell.col])
    values[hint.cell.row][hint.cell.col] = hint.digit
    steps++
  }
  expect(values).toEqual(level.solution)
  return steps
}

describe('findSudokuHint', () => {
  it('only ever suggests correct digits, through to a solved classic board', () => {
    for (const level of (sudokuHard as SudokuLevelRecord[]).slice(0, 5)) playOut(level)
  })

  it('only ever suggests correct digits, through to a solved Killer board', () => {
    for (const level of (killerMedium as KillerLevelRecord[]).slice(0, 5)) playOut(level)
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
