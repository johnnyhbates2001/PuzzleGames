import { describe, expect, it } from 'vitest'
import { getDailyNonogramLevel, getDailyQueensLevel, getDailyWordleLevel, hashSeed } from './dailyChallenge'

const WORDLE_POOL = ['crane', 'stare', 'apple', 'grape', 'mango', 'zesty', 'burnt', 'quilt']

describe('hashSeed', () => {
  it('is deterministic for the same input', () => {
    expect(hashSeed('queens:2026-08-24')).toBe(hashSeed('queens:2026-08-24'))
  })

  it('differs across distinct inputs', () => {
    expect(hashSeed('queens:2026-08-24')).not.toBe(hashSeed('sudoku:2026-08-24'))
    expect(hashSeed('queens:2026-08-24')).not.toBe(hashSeed('queens:2026-08-25'))
  })
})

describe('getDailyQueensLevel', () => {
  it('generates the identical puzzle for the same date', () => {
    const a = getDailyQueensLevel('2026-08-24')
    const b = getDailyQueensLevel('2026-08-24')
    expect(a.regions).toEqual(b.regions)
    expect(a.solution).toEqual(b.solution)
    expect(a.id).toBe(b.id)
  })

  it('generates a different puzzle for a different date', () => {
    const a = getDailyQueensLevel('2026-08-24')
    const b = getDailyQueensLevel('2026-08-25')
    expect(a.regions).not.toEqual(b.regions)
  })
})

describe('getDailyNonogramLevel', () => {
  it('generates the identical puzzle for the same date', () => {
    const a = getDailyNonogramLevel('2026-08-24')
    const b = getDailyNonogramLevel('2026-08-24')
    expect(a.solution).toEqual(b.solution)
    expect(a.id).toBe(b.id)
  })

  it('generates a different puzzle for a different date', () => {
    const a = getDailyNonogramLevel('2026-08-24')
    const b = getDailyNonogramLevel('2026-08-25')
    expect(a.solution).not.toEqual(b.solution)
  })
})

describe('getDailyWordleLevel', () => {
  it('generates the identical word for the same date', () => {
    const a = getDailyWordleLevel('2026-08-24', WORDLE_POOL)
    const b = getDailyWordleLevel('2026-08-24', WORDLE_POOL)
    expect(a.answer).toBe(b.answer)
    expect(a.id).toBe(b.id)
  })

  it('picks a word from the given pool', () => {
    const level = getDailyWordleLevel('2026-08-24', WORDLE_POOL)
    expect(WORDLE_POOL).toContain(level.answer)
  })
})
