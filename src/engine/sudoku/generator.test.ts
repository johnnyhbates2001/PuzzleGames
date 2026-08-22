import { describe, expect, it } from 'vitest'
import { generateLevel, generateSolvedGrid, removeCells } from './generator'
import { countSolutions } from './solver'
import { mulberry32, shuffle } from '../rng'
import { SUDOKU_SIZE, type Difficulty, type SudokuLevelRecord } from './types'
import easyBank from '../../data/banks/sudoku-easy.json'
import mediumBank from '../../data/banks/sudoku-medium.json'
import hardBank from '../../data/banks/sudoku-hard.json'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const SAMPLES_PER_DIFFICULTY = 3

function isValidSolvedGrid(grid: number[][]): boolean {
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    if (new Set(grid[r]).size !== SUDOKU_SIZE) return false
  }
  for (let c = 0; c < SUDOKU_SIZE; c++) {
    const col = grid.map((row) => row[c])
    if (new Set(col).size !== SUDOKU_SIZE) return false
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box = new Set<number>()
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) box.add(grid[r][c])
      }
      if (box.size !== SUDOKU_SIZE) return false
    }
  }
  return true
}

describe('generateSolvedGrid', () => {
  it('produces a fully valid, filled 9x9 solution', () => {
    const rng = mulberry32(1)
    const grid = generateSolvedGrid(rng)
    expect(grid.flat().every((v) => v >= 1 && v <= 9)).toBe(true)
    expect(isValidSolvedGrid(grid)).toBe(true)
  })
})

describe('removeCells', () => {
  it('produces a puzzle at or below the target given count with a unique solution', () => {
    const rng = mulberry32(2)
    const solution = generateSolvedGrid(rng)
    const { puzzle, givens } = removeCells(solution, 32, rng)
    expect(givens).toBeLessThanOrEqual(32)
    expect(countSolutions(puzzle, 2)).toBe(1)
    // every given must match the solution
    for (let r = 0; r < SUDOKU_SIZE; r++) {
      for (let c = 0; c < SUDOKU_SIZE; c++) {
        if (puzzle[r][c] !== 0) expect(puzzle[r][c]).toBe(solution[r][c])
      }
    }
  })
})

describe('generateLevel', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces ${SAMPLES_PER_DIFFICULTY} verified unique-solution ${difficulty} levels`, () => {
      const rng = mulberry32(1000)
      for (let i = 0; i < SAMPLES_PER_DIFFICULTY; i++) {
        const level = generateLevel(difficulty, rng)
        expect(level).not.toBeNull()
        const lvl = level!
        expect(lvl.puzzle.length).toBe(SUDOKU_SIZE)
        expect(isValidSolvedGrid(lvl.solution)).toBe(true)
        expect(countSolutions(lvl.puzzle, 2)).toBe(1)
        for (let r = 0; r < SUDOKU_SIZE; r++) {
          for (let c = 0; c < SUDOKU_SIZE; c++) {
            if (lvl.puzzle[r][c] !== 0) expect(lvl.puzzle[r][c]).toBe(lvl.solution[r][c])
          }
        }
      }
    }, 20_000)
  }
})

describe('committed level banks', () => {
  const banks: Record<Difficulty, SudokuLevelRecord[]> = {
    easy: easyBank as SudokuLevelRecord[],
    medium: mediumBank as SudokuLevelRecord[],
    hard: hardBank as SudokuLevelRecord[],
  }
  const SPOT_CHECK_COUNT = 5

  for (const difficulty of DIFFICULTIES) {
    it(`spot-checks ${SPOT_CHECK_COUNT} random committed ${difficulty} levels for uniqueness`, () => {
      const bank = banks[difficulty]
      expect(bank.length).toBeGreaterThan(0)
      const rng = mulberry32(42)
      const sample = shuffle(bank, rng).slice(0, SPOT_CHECK_COUNT)
      for (const level of sample) {
        expect(countSolutions(level.puzzle, 2)).toBe(1)
      }
    })
  }
})
