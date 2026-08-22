import { describe, expect, it } from 'vitest'
import { computeCoinAward } from './db'

// getStreak/getHeatmap/spendCoins etc. need a real IndexedDB (no fake-indexeddb
// dependency in this repo), so only the pure coin-award formula is unit-tested here.
describe('computeCoinAward', () => {
  it('awards the difficulty base with no personal-best bonus', () => {
    expect(computeCoinAward('easy', false, false)).toBe(15)
    expect(computeCoinAward('medium', false, false)).toBe(25)
    expect(computeCoinAward('hard', false, false)).toBe(35)
  })

  it('adds the personal-best bonus when not assisted', () => {
    expect(computeCoinAward('easy', true, false)).toBe(15 + 15)
  })

  it('never awards the personal-best bonus on an assisted solve, even if isPersonalBest is true', () => {
    expect(computeCoinAward('easy', true, true)).toBe(15)
  })
})
