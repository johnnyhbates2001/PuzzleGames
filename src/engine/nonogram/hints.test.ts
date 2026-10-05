import { describe, expect, it } from 'vitest'
import { findNonogramHint } from './hints'
import type { NonogramLevelRecord } from './types'
import type { Mark } from './validator'
import hardBank from '../../data/banks/nonogram-hard.json'

describe('findNonogramHint', () => {
  it('solves levels from empty using only correct line deductions', () => {
    for (const level of (hardBank as NonogramLevelRecord[]).slice(0, 10)) {
      const grid: Mark[][] = Array.from({ length: level.size }, () => new Array<Mark>(level.size).fill('empty'))
      const solved = () => level.solution.every((row, r) => row.every((v, c) => (grid[r][c] === 'filled') === v))
      for (let i = 0; i < 400 && !solved(); i++) {
        const hint = findNonogramHint(level, grid)
        expect(hint?.kind).toBe('mark')
        if (hint?.kind !== 'mark') break
        for (const p of hint.cells) {
          expect(p.mark === 'filled').toBe(level.solution[p.row][p.col])
          grid[p.row][p.col] = p.mark
        }
      }
      expect(solved()).toBe(true)
    }
  })

  it('points out a wrongly filled square first', () => {
    const level = (hardBank as NonogramLevelRecord[])[0]
    const grid: Mark[][] = Array.from({ length: level.size }, () => new Array<Mark>(level.size).fill('empty'))
    const r = level.solution.findIndex((row) => row.some((v) => !v))
    const c = level.solution[r].findIndex((v) => !v)
    grid[r][c] = 'filled'
    expect(findNonogramHint(level, grid)).toMatchObject({ kind: 'mistake', cell: { row: r, col: c } })
  })
})
