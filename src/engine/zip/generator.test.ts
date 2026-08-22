import { describe, expect, it } from 'vitest'
import { addWallsForUniqueness, generateHamiltonianPath, generateLevel, pickCheckpoints } from './generator'
import { countHamiltonianPaths } from './solver'
import { coordKey, gridNeighbors, ZIP_SIZE, type Difficulty } from './types'
import { mulberry32 } from '../rng'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

function isValidFullPath(size: number, path: ReturnType<typeof generateHamiltonianPath>): void {
  expect(path).not.toBeNull()
  const p = path!
  expect(p.length).toBe(size * size)
  expect(new Set(p.map(coordKey)).size).toBe(size * size) // every cell visited exactly once
  for (let i = 0; i < p.length - 1; i++) {
    const isAdjacent = gridNeighbors(size, p[i]).some((nb) => coordKey(nb) === coordKey(p[i + 1]))
    expect(isAdjacent).toBe(true)
  }
}

describe('generateHamiltonianPath', () => {
  it('produces a full, self-consistent path for a range of sizes', () => {
    const rng = mulberry32(1)
    for (const size of [4, 5, 6]) {
      isValidFullPath(size, generateHamiltonianPath(size, rng))
    }
  })
})

describe('pickCheckpoints', () => {
  it('always includes the first and last path cells', () => {
    const rng = mulberry32(2)
    const path = generateHamiltonianPath(6, rng)!
    const checkpoints = pickCheckpoints(path, 5)
    expect(checkpoints.length).toBe(5)
    expect(coordKey(checkpoints[0])).toBe(coordKey(path[0]))
    expect(coordKey(checkpoints[checkpoints.length - 1])).toBe(coordKey(path[path.length - 1]))
  })

  it('returns checkpoints in the same order they appear along the path', () => {
    const rng = mulberry32(3)
    const path = generateHamiltonianPath(6, rng)!
    const checkpoints = pickCheckpoints(path, 6)
    const indices = checkpoints.map((cp) => path.findIndex((c) => coordKey(c) === coordKey(cp)))
    for (let i = 1; i < indices.length; i++) expect(indices[i]).toBeGreaterThan(indices[i - 1])
  })
})

describe('addWallsForUniqueness', () => {
  it('never walls off an edge the true solution path actually uses', () => {
    const rng = mulberry32(4)
    const path = generateHamiltonianPath(5, rng)!
    const checkpoints = pickCheckpoints(path, 9)
    const walls = addWallsForUniqueness(5, checkpoints, path, rng, 8)
    expect(walls).not.toBeNull()
    expect(countHamiltonianPaths(5, checkpoints, walls!, 2)).toBe(1)
  })
})

describe('generateLevel', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`produces a verified unique-solution ${difficulty} level`, () => {
      const rng = mulberry32(1000)
      const level = generateLevel(difficulty, rng)
      expect(level).not.toBeNull()
      const lvl = level!
      expect(lvl.size).toBe(ZIP_SIZE[difficulty])
      isValidFullPath(lvl.size, lvl.solution)
      expect(coordKey(lvl.checkpoints[0])).toBe(coordKey(lvl.solution[0]))
      expect(countHamiltonianPaths(lvl.size, lvl.checkpoints, new Set(lvl.walls), 2)).toBe(1)
    }, 20_000)
  }
})
