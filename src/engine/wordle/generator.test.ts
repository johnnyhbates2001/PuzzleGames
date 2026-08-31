import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { generateLevel } from './generator'

const POOL = ['crane', 'stare', 'apple', 'grape', 'mango']

describe('generateLevel', () => {
  it('always returns a word from the pool', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 20; i++) {
      const level = generateLevel('medium', rng, POOL)
      expect(POOL).toContain(level.answer)
      expect(level.difficulty).toBe('medium')
    }
  })

  it('is deterministic for the same seed', () => {
    const a = generateLevel('easy', mulberry32(42), POOL)
    const b = generateLevel('easy', mulberry32(42), POOL)
    expect(a.answer).toBe(b.answer)
  })
})
