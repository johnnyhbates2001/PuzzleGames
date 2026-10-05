import { describe, expect, it } from 'vitest'
import { generateLevel, generateSolvedGrid } from './generator'
import { countSolutions, logicSolve } from './solver'
import { isSolved } from './validator'
import { mulberry32, shuffle } from '../rng'
import { EMPTY, TANGO_SIZE, type Difficulty, type TangoLevelRecord } from './types'
import easyBank from '../../data/banks/tango-easy.json'
import mediumBank from '../../data/banks/tango-medium.json'
import hardBank from '../../data/banks/tango-hard.json'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const LOGIC_LEVEL: Record<Difficulty, 0 | 1> = { easy: 0, medium: 1, hard: 1 }

describe('generateSolvedGrid', () => {
  for (const size of [6, 8]) {
    it(`produces a valid, filled ${size}x${size} solution`, () => {
      const grid = generateSolvedGrid(size, mulberry32(size))
      expect(grid.flat().every((v) => v !== EMPTY)).toBe(true)
      expect(isSolved(grid, [])).toBe(true)
    })
  }
})

describe('generateLevel', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces unique, logic-solvable ${difficulty} levels`, () => {
      const rng = mulberry32(1000)
      for (let i = 0; i < 5; i++) {
        const level = generateLevel(difficulty, rng)!
        expect(level).not.toBeNull()
        expect(level.size).toBe(TANGO_SIZE[difficulty])
        expect(isSolved(level.solution, level.edges)).toBe(true)
        expect(countSolutions(level.givens, level.edges)).toBe(1)
        expect(logicSolve(level.givens, level.edges, LOGIC_LEVEL[difficulty])).toEqual(level.solution)
        level.givens.forEach((row, r) => row.forEach((v, c) => v !== EMPTY && expect(v).toBe(level.solution[r][c])))
      }
    })
  }

  it('is deterministic for a given seed (the Daily Challenge relies on this)', () => {
    const a = generateLevel('medium', mulberry32(77))!
    const b = generateLevel('medium', mulberry32(77))!
    expect(a.givens).toEqual(b.givens)
    expect(a.edges).toEqual(b.edges)
  })
})

describe('committed level banks', () => {
  const banks: Record<Difficulty, TangoLevelRecord[]> = {
    easy: easyBank as unknown as TangoLevelRecord[],
    medium: mediumBank as unknown as TangoLevelRecord[],
    hard: hardBank as unknown as TangoLevelRecord[],
  }

  for (const difficulty of DIFFICULTIES) {
    it(`spot-checks committed ${difficulty} levels for uniqueness and logic-solvability`, () => {
      const bank = banks[difficulty]
      expect(bank.length).toBeGreaterThan(0)
      for (const level of shuffle(bank, mulberry32(42)).slice(0, 10)) {
        expect(countSolutions(level.givens, level.edges)).toBe(1)
        expect(logicSolve(level.givens, level.edges, LOGIC_LEVEL[difficulty])).toEqual(level.solution)
      }
    })
  }
})
