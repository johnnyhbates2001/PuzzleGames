import { describe, expect, it } from 'vitest'
import { generateCages, generateLevel } from './generator'
import { countSolutions } from './solver'
import { getConflicts, isSolved } from './validator'
import { generateSolvedGrid } from '../sudoku/generator'
import { mulberry32, shuffle } from '../rng'
import type { Difficulty, KillerLevelRecord } from './types'
import easyBank from '../../data/banks/killer-easy.json'
import mediumBank from '../../data/banks/killer-medium.json'
import hardBank from '../../data/banks/killer-hard.json'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

describe('generateCages', () => {
  it('partitions all 81 cells into connected cages with no repeated digit and correct sums', () => {
    const solution = generateSolvedGrid(mulberry32(3))
    const cages = generateCages(solution, [2, 3, 4, 5], mulberry32(4))
    const seen = new Set<string>()
    for (const cage of cages) {
      const digits = cage.cells.map(({ row, col }) => solution[row][col])
      expect(new Set(digits).size).toBe(digits.length)
      expect(digits.reduce((a, b) => a + b, 0)).toBe(cage.sum)
      for (const { row, col } of cage.cells) {
        const key = `${row},${col}`
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
      // Connected: every cell (after the first) touches an earlier-visited cell via BFS.
      const inCage = new Set(cage.cells.map((c) => `${c.row},${c.col}`))
      const stack = [cage.cells[0]]
      const reached = new Set([`${cage.cells[0].row},${cage.cells[0].col}`])
      while (stack.length) {
        const { row, col } = stack.pop()!
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const key = `${row + dr},${col + dc}`
          if (inCage.has(key) && !reached.has(key)) {
            reached.add(key)
            stack.push({ row: row + dr, col: col + dc })
          }
        }
      }
      expect(reached.size).toBe(cage.cells.length)
    }
    expect(seen.size).toBe(81)
  })
})

describe('generateLevel', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces verified unique-solution ${difficulty} levels`, () => {
      const rng = mulberry32(1000)
      for (let i = 0; i < 3; i++) {
        const level = generateLevel(difficulty, rng)
        expect(level).not.toBeNull()
        const lvl = level!
        expect(isSolved(lvl.solution, lvl.cages)).toBe(true)
        expect(countSolutions(lvl.puzzle, lvl.cages, 2, 5_000_000)).toBe(1)
        lvl.puzzle.forEach((row, r) => row.forEach((v, c) => v !== 0 && expect(v).toBe(lvl.solution[r][c])))
      }
    }, 30_000)
  }
})

describe('getConflicts', () => {
  it('flags a full cage that misses its sum and a repeated digit inside a cage', () => {
    const board = Array.from({ length: 9 }, () => new Array<number>(9).fill(0))
    const cages = [
      { cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], sum: 5 },
      { cells: [{ row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }], sum: 20 },
    ]
    board[0][0] = 1
    board[0][1] = 2
    board[2][0] = 4
    board[2][1] = 4
    const bad = getConflicts(board, cages)
    expect(bad.has('0,0')).toBe(true)
    expect(bad.has('0,1')).toBe(true)
    expect(bad.has('2,1')).toBe(true)
    expect(bad.has('1,0')).toBe(false)
  })
})

describe('committed level banks', () => {
  const banks: Record<Difficulty, KillerLevelRecord[]> = {
    easy: easyBank as KillerLevelRecord[],
    medium: mediumBank as KillerLevelRecord[],
    hard: hardBank as KillerLevelRecord[],
  }

  for (const difficulty of DIFFICULTIES) {
    it(`spot-checks committed ${difficulty} levels for uniqueness`, () => {
      const bank = banks[difficulty]
      expect(bank.length).toBeGreaterThan(0)
      for (const level of shuffle(bank, mulberry32(42)).slice(0, 5)) {
        expect(countSolutions(level.puzzle, level.cages, 2, 5_000_000)).toBe(1)
      }
    }, 30_000)
  }
})
