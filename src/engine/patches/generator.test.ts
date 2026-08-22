import { describe, expect, it } from 'vitest'
import { cluesFromPartition, generateLevel, generatePartition } from './generator'
import { countSolutions } from './solver'
import { PATCHES_SIZE, shapeOf, type Difficulty } from './types'
import { mulberry32 } from '../rng'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

describe('generatePartition', () => {
  it('produces non-overlapping rectangles that exactly tile the grid', () => {
    const rng = mulberry32(1)
    const size = 6
    const rects = generatePartition(size, 8, rng)

    const covered: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1))
    rects.forEach((rect, i) => {
      for (let r = rect.row; r < rect.row + rect.height; r++) {
        for (let c = rect.col; c < rect.col + rect.width; c++) {
          expect(covered[r][c]).toBe(-1) // no overlap
          covered[r][c] = i
        }
      }
    })
    for (const row of covered) for (const v of row) expect(v).not.toBe(-1) // full coverage
  })
})

describe('cluesFromPartition', () => {
  it('places exactly one clue per rectangle, with the true area and shape', () => {
    const rng = mulberry32(2)
    const rects = generatePartition(6, 6, rng)
    const clues = cluesFromPartition(rects, mulberry32(3))

    expect(clues.length).toBe(rects.length)
    clues.forEach((clue, i) => {
      const rect = rects[i]
      expect(clue.area).toBe(rect.width * rect.height)
      expect(clue.shape).toBe(shapeOf(rect))

      // Must sit at a corner, not just anywhere inside the rect — the player draws a
      // rectangle by dragging from the clue to its opposite corner, so an interior
      // clue would make the true rectangle physically undrawable.
      const isCornerRow = clue.cell.row === rect.row || clue.cell.row === rect.row + rect.height - 1
      const isCornerCol = clue.cell.col === rect.col || clue.cell.col === rect.col + rect.width - 1
      expect(isCornerRow).toBe(true)
      expect(isCornerCol).toBe(true)
    })
  })
})

describe('generateLevel', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces a verified unique-solution ${difficulty} level`, () => {
      const rng = mulberry32(1000)
      const level = generateLevel(difficulty, rng)
      expect(level).not.toBeNull()
      const lvl = level!
      expect(lvl.size).toBe(PATCHES_SIZE[difficulty])
      expect(countSolutions(lvl.size, lvl.clues, 2)).toBe(1)

      // every cell belongs to exactly one solution rectangle
      const covered: number[][] = Array.from({ length: lvl.size }, () => new Array(lvl.size).fill(-1))
      lvl.solution.forEach((rect, i) => {
        for (let r = rect.row; r < rect.row + rect.height; r++) {
          for (let c = rect.col; c < rect.col + rect.width; c++) {
            expect(covered[r][c]).toBe(-1)
            covered[r][c] = i
          }
        }
      })
      for (const row of covered) for (const v of row) expect(v).not.toBe(-1)
    }, 20_000)
  }
})
