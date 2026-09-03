import { describe, expect, it } from 'vitest'
import { buildBossAssists } from './BossGateSheet'
import type { Settings } from '../storage/db'
import type { LevelModifiers } from '../games/chapters'

function fakeSettings(overrides: Partial<Settings>): Settings {
  return { undoTokens: 0, timeFreezes: 0, mistakeSaves: 0, ...overrides } as Settings
}

function fakeModifiers(overrides: Partial<LevelModifiers>): LevelModifiers {
  return { noUndo: false, noHints: false, timed: false, perfectRun: false, ...overrides }
}

describe('buildBossAssists', () => {
  it('offers nothing when there are no modifiers', () => {
    expect(buildBossAssists(null, fakeSettings({ undoTokens: 5, timeFreezes: 5, mistakeSaves: 5 }))).toEqual([])
  })

  it('offers an Undo Token only when No Undo is active and at least one is owned', () => {
    expect(buildBossAssists(fakeModifiers({ noUndo: true }), fakeSettings({ undoTokens: 0 }))).toEqual([])
    const result = buildBossAssists(fakeModifiers({ noUndo: true }), fakeSettings({ undoTokens: 2 }))
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ kind: 'undoToken', owned: 2 })
  })

  it('offers a Time Freeze only when Timed is active and at least one is owned', () => {
    expect(buildBossAssists(fakeModifiers({ timed: true }), fakeSettings({ timeFreezes: 0 }))).toEqual([])
    const result = buildBossAssists(fakeModifiers({ timed: true }), fakeSettings({ timeFreezes: 1 }))
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ kind: 'timeFreeze', owned: 1 })
  })

  it('offers a Mistake Save only when Perfect Run is active and at least one is owned', () => {
    expect(buildBossAssists(fakeModifiers({ perfectRun: true }), fakeSettings({ mistakeSaves: 0 }))).toEqual([])
    const result = buildBossAssists(fakeModifiers({ perfectRun: true }), fakeSettings({ mistakeSaves: 3 }))
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ kind: 'mistakeSave', owned: 3 })
  })

  it('never offers an assist for a modifier that is not active on this level, even if owned', () => {
    expect(
      buildBossAssists(fakeModifiers({ noUndo: false, timed: false, perfectRun: false }), fakeSettings({ undoTokens: 5, timeFreezes: 5, mistakeSaves: 5 })),
    ).toEqual([])
  })

  it('offers every matching assist at once for a boss level stacking multiple modifiers', () => {
    const result = buildBossAssists(
      fakeModifiers({ noUndo: true, timed: true, perfectRun: true }),
      fakeSettings({ undoTokens: 1, timeFreezes: 1, mistakeSaves: 1 }),
    )
    expect(result.map((a) => a.kind)).toEqual(['undoToken', 'timeFreeze', 'mistakeSave'])
  })
})
