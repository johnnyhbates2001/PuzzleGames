import { describe, expect, it } from 'vitest'
import { generateLevel, generateSolutionSeed, growRegions } from './generator'
import { countSolutions } from './solver'
import { mulberry32, shuffle } from './rng'
import { DIFFICULTY_SIZE, type Difficulty, type LevelRecord } from './types'
import easyBank from '../data/banks/easy.json'
import mediumBank from '../data/banks/medium.json'
import hardBank from '../data/banks/hard.json'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const SAMPLES_PER_DIFFICULTY = 3

describe('generateSolutionSeed', () => {
  it('produces a valid row/col permutation with no two adjacent rows within 1 column of each other', () => {
    const rng = mulberry32(1)
    for (const difficulty of DIFFICULTIES) {
      const n = DIFFICULTY_SIZE[difficulty]
      const seed = generateSolutionSeed(n, rng)
      expect(seed).not.toBeNull()
      const cols = seed!.map((c) => c.col)
      expect(new Set(cols).size).toBe(n)
      for (let row = 1; row < n; row++) {
        expect(Math.abs(cols[row] - cols[row - 1])).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

describe('growRegions', () => {
  it('produces exactly N contiguous regions, each containing exactly one seed', () => {
    const rng = mulberry32(2)
    for (const difficulty of DIFFICULTIES) {
      const n = DIFFICULTY_SIZE[difficulty]
      const seed = generateSolutionSeed(n, rng)!
      const regions = growRegions(seed, n, rng)

      // every cell assigned, ids within range
      const counts = new Array(n).fill(0)
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const id = regions[r][c]
          expect(id).toBeGreaterThanOrEqual(0)
          expect(id).toBeLessThan(n)
          counts[id]++
        }
      }
      // every region non-empty and every seed sits in its own region id
      for (const count of counts) expect(count).toBeGreaterThan(0)
      seed.forEach((cell, i) => expect(regions[cell.row][cell.col]).toBe(i))

      // contiguity: BFS/flood-fill from the seed using 4-directional adjacency
      // must reach every cell assigned to that region.
      for (let regionId = 0; regionId < n; regionId++) {
        const seedCell = seed[regionId]
        const visited = new Set<string>([`${seedCell.row},${seedCell.col}`])
        const queue = [seedCell]
        while (queue.length > 0) {
          const cur = queue.pop()!
          const deltas = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]
          for (const [dr, dc] of deltas) {
            const nr = cur.row + dr
            const nc = cur.col + dc
            if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue
            if (regions[nr][nc] !== regionId) continue
            const key = `${nr},${nc}`
            if (visited.has(key)) continue
            visited.add(key)
            queue.push({ row: nr, col: nc })
          }
        }
        expect(visited.size).toBe(counts[regionId])
      }
    }
  })
})

describe('generateLevel', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces ${SAMPLES_PER_DIFFICULTY} verified unique-solution ${difficulty} (${DIFFICULTY_SIZE[difficulty]}x${DIFFICULTY_SIZE[difficulty]}) levels`, () => {
      const n = DIFFICULTY_SIZE[difficulty]
      const rng = mulberry32(1000 + n)
      for (let i = 0; i < SAMPLES_PER_DIFFICULTY; i++) {
        const level = generateLevel(difficulty, rng)
        expect(level).not.toBeNull()
        const lvl = level!
        expect(lvl.size).toBe(n)
        expect(lvl.solution.length).toBe(n)

        // exactly one solution
        expect(countSolutions(lvl.regions, 2)).toBe(1)

        // exactly N regions, each containing exactly one solution queen
        const regionOfSolutionQueen = lvl.solution.map((q) => lvl.regions[q.row][q.col])
        expect(new Set(regionOfSolutionQueen).size).toBe(n)

        const regionIdsPresent = new Set<number>()
        for (const row of lvl.regions) for (const id of row) regionIdsPresent.add(id)
        expect(regionIdsPresent.size).toBe(n)
      }
    }, 20_000)
  }
})

describe('committed level banks', () => {
  const banks: Record<Difficulty, LevelRecord[]> = {
    easy: easyBank as LevelRecord[],
    medium: mediumBank as LevelRecord[],
    hard: hardBank as LevelRecord[],
  }
  const SPOT_CHECK_COUNT = 5

  for (const difficulty of DIFFICULTIES) {
    it(`spot-checks ${SPOT_CHECK_COUNT} random committed ${difficulty} levels for uniqueness`, () => {
      const bank = banks[difficulty]
      expect(bank.length).toBeGreaterThan(0)
      const rng = mulberry32(42)
      const sample = shuffle(bank, rng).slice(0, SPOT_CHECK_COUNT)
      for (const level of sample) {
        expect(countSolutions(level.regions, 2)).toBe(1)
      }
    })
  }
})
