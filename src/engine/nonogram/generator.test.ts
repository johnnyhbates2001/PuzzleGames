import { describe, expect, it } from 'vitest'
import { generateLevel } from './generator'
import { solveByLogic } from './solver'
import { NONOGRAM_SIZE, cluesFromSolution, type Difficulty } from './types'
import { mulberry32 } from '../rng'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

describe('generateLevel', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces a verified logic-solvable ${difficulty} level`, () => {
      const rng = mulberry32(1000)
      const level = generateLevel(difficulty, rng)
      expect(level).not.toBeNull()
      const lvl = level!
      expect(lvl.size).toBe(NONOGRAM_SIZE[difficulty])

      // The stored clues match the stored solution...
      expect(cluesFromSolution(lvl.solution)).toEqual({ rowClues: lvl.rowClues, colClues: lvl.colClues })

      // ...and, independently, re-solving from just those clues recovers that exact
      // solution — the same uniqueness proof generateLevel itself relies on.
      const result = solveByLogic(lvl.size, lvl.rowClues, lvl.colClues)
      expect(result.solved).toBe(true)
      expect(result.grid).toEqual(lvl.solution)
    }, 20_000)
  }
})
