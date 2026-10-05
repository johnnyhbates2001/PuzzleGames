import { describe, expect, it } from 'vitest'
import { findTangoHint } from './hints'
import { EMPTY, MOON, SUN, type TangoGrid, type TangoLevelRecord } from './types'
import mediumBank from '../../data/banks/tango-medium.json'
import hardBank from '../../data/banks/tango-hard.json'

describe('findTangoHint', () => {
  for (const [name, bank] of [['medium', mediumBank], ['hard', hardBank]] as const) {
    it(`solves ${name} levels with correct, explained steps`, () => {
      for (const level of (bank as unknown as TangoLevelRecord[]).slice(0, 20)) {
        const grid = level.givens.map((r) => r.slice())
        for (let hint = findTangoHint(grid, level.solution, level.edges); hint; hint = findTangoHint(grid, level.solution, level.edges)) {
          expect(hint.kind).toBe('place')
          if (hint.kind !== 'place') break
          expect(hint.message).not.toMatch(/no simple deduction|breaking a rule/)
          for (const p of hint.cells) {
            expect(level.solution[p.row][p.col]).toBe(hint.value)
            grid[p.row][p.col] = hint.value
          }
        }
        expect(grid).toEqual(level.solution)
      }
    })
  }

  it('explains a pair forcing the next square', () => {
    const grid: TangoGrid = Array.from({ length: 6 }, () => new Array(6).fill(EMPTY))
    grid[0][0] = SUN
    grid[0][1] = SUN
    const solution: TangoGrid = Array.from({ length: 6 }, () => new Array(6).fill(SUN))
    solution[0][2] = MOON
    const hint = findTangoHint(grid, solution, [])
    expect(hint).toMatchObject({ kind: 'place', cells: [{ row: 0, col: 2 }], value: MOON })
    expect(hint!.message).toContain('side by side')
  })
})
