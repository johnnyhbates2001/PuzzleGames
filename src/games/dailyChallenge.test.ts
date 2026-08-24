import { describe, expect, it } from 'vitest'
import { DAILY_GAMES, gameForDate, getDailyQueensLevel, hashSeed } from './dailyChallenge'

describe('gameForDate', () => {
  it('is deterministic for a given date', () => {
    expect(gameForDate('2026-08-24')).toBe(gameForDate('2026-08-24'))
  })

  it('only ever returns a known game id', () => {
    for (const d of ['2026-01-01', '2026-06-15', '2026-12-31']) {
      expect(DAILY_GAMES).toContain(gameForDate(d))
    }
  })

  it('rotates day over day (not the same game every day)', () => {
    const games = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27'].map(gameForDate)
    expect(new Set(games).size).toBeGreaterThan(1)
  })
})

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
