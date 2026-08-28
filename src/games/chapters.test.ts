import { describe, expect, it } from 'vitest'
import {
  CHAPTERS_PER_TIER,
  CHAPTER_META,
  LEVELS_PER_CHAPTER,
  STORY_LEVELS_PER_TIER,
  TOTAL_STORY_CHAPTERS,
  buildChapterNodes,
  chapterForIndex,
  chaptersCompletedInTier,
  difficultyForChapter,
  endlessProgress,
  modifierLabel,
  modifiersForLevel,
} from './chapters'

describe('CHAPTER_META', () => {
  it('has exactly one entry per story chapter', () => {
    expect(CHAPTER_META).toHaveLength(TOTAL_STORY_CHAPTERS)
  })

  it('grants a reward skin at every 3rd chapter, and only those', () => {
    CHAPTER_META.forEach((meta, i) => {
      const chapterNumber = i + 1
      if (chapterNumber % 3 === 0) {
        expect(meta.skinId).toBeDefined()
      } else {
        expect(meta.skinId).toBeUndefined()
      }
    })
  })
})

describe('difficultyForChapter', () => {
  it('maps chapters 1-10 to easy, 11-20 to medium, 21-30 to hard', () => {
    expect(difficultyForChapter(1)).toBe('easy')
    expect(difficultyForChapter(10)).toBe('easy')
    expect(difficultyForChapter(11)).toBe('medium')
    expect(difficultyForChapter(20)).toBe('medium')
    expect(difficultyForChapter(21)).toBe('hard')
    expect(difficultyForChapter(30)).toBe('hard')
  })
})

describe('chapterForIndex', () => {
  it('places index 0 in chapter 1, level 1 (not a boss level)', () => {
    const result = chapterForIndex(0, 'easy')
    expect(result).toEqual({ chapterNumber: 1, levelInChapter: 0, isBoss: false })
  })

  it('places index 19 (the 20th level) in chapter 1 as the boss level', () => {
    const result = chapterForIndex(19, 'easy')
    expect(result).toEqual({ chapterNumber: 1, levelInChapter: 19, isBoss: true })
  })

  it('places index 20 in chapter 2, level 1', () => {
    const result = chapterForIndex(20, 'easy')
    expect(result).toEqual({ chapterNumber: 2, levelInChapter: 0, isBoss: false })
  })

  it('applies the tier offset for medium and hard', () => {
    expect(chapterForIndex(0, 'medium').chapterNumber).toBe(CHAPTERS_PER_TIER + 1)
    expect(chapterForIndex(0, 'hard').chapterNumber).toBe(CHAPTERS_PER_TIER * 2 + 1)
  })

  it('clamps indexes past the story range to the tier\'s final chapter (Endless territory)', () => {
    const atBoundary = chapterForIndex(199, 'hard')
    const wayPast = chapterForIndex(1000, 'hard')
    expect(wayPast).toEqual(atBoundary)
    expect(wayPast.chapterNumber).toBe(TOTAL_STORY_CHAPTERS)
  })
})

describe('chaptersCompletedInTier', () => {
  it('counts whole chapters only, capped at the tier size', () => {
    expect(chaptersCompletedInTier(0)).toBe(0)
    expect(chaptersCompletedInTier(19)).toBe(0)
    expect(chaptersCompletedInTier(20)).toBe(1)
    expect(chaptersCompletedInTier(200)).toBe(CHAPTERS_PER_TIER)
    expect(chaptersCompletedInTier(999)).toBe(CHAPTERS_PER_TIER)
  })
})

describe('buildChapterNodes', () => {
  it('on a fresh profile, only chapter 1 is current — every other chapter, including the first of each later tier, is locked', () => {
    const nodes = buildChapterNodes({ easy: 0, medium: 0, hard: 0 })
    expect(nodes).toHaveLength(TOTAL_STORY_CHAPTERS)
    expect(nodes[0].status).toBe('current') // chapter 1
    expect(nodes[10].status).toBe('locked') // chapter 11 (medium's first) — regression guard
    expect(nodes[20].status).toBe('locked') // chapter 21 (hard's first) — regression guard
    expect(nodes.filter((n) => n.status === 'locked')).toHaveLength(TOTAL_STORY_CHAPTERS - 1)
  })

  it('unlocks a later tier only once the earlier tier is fully complete', () => {
    const nodes = buildChapterNodes({ easy: STORY_LEVELS_PER_TIER, medium: 0, hard: 0 })
    expect(nodes[9].status).toBe('complete') // chapter 10, easy's last
    expect(nodes[10].status).toBe('current') // chapter 11, medium's first, now unlocked
    expect(nodes[20].status).toBe('locked') // chapter 21, hard's first, still locked
  })

  it('marks mid-chapter progress as current with the right levelInChapter', () => {
    const nodes = buildChapterNodes({ easy: 25, medium: 0, hard: 0 })
    expect(nodes[0].status).toBe('complete') // chapter 1 finished
    expect(nodes[1]).toMatchObject({ status: 'current', levelInChapter: 5 }) // chapter 2, 5 levels in
  })
})

describe('endlessProgress', () => {
  it('is null until the hard story spine is actually finished', () => {
    expect(endlessProgress(0)).toBeNull()
    expect(endlessProgress(STORY_LEVELS_PER_TIER - 1)).toBeNull()
  })

  it('starts endless chapter 1 the instant the spine finishes', () => {
    expect(endlessProgress(STORY_LEVELS_PER_TIER)).toEqual({
      endlessChapter: 1,
      levelInChapter: 0,
      rank: 'Bronze',
      isBoss: false,
    })
  })

  it('flags the 20th level of an endless chapter as the boss level', () => {
    expect(endlessProgress(STORY_LEVELS_PER_TIER + LEVELS_PER_CHAPTER - 1)).toMatchObject({
      endlessChapter: 1,
      levelInChapter: LEVELS_PER_CHAPTER - 1,
      isBoss: true,
    })
    expect(endlessProgress(STORY_LEVELS_PER_TIER + LEVELS_PER_CHAPTER)).toMatchObject({
      endlessChapter: 2,
      levelInChapter: 0,
      isBoss: false,
    })
  })

  it('advances endless chapters every 20 levels past the spine', () => {
    expect(endlessProgress(STORY_LEVELS_PER_TIER + LEVELS_PER_CHAPTER)).toMatchObject({
      endlessChapter: 2,
      levelInChapter: 0,
    })
    expect(endlessProgress(STORY_LEVELS_PER_TIER + 45)).toMatchObject({
      endlessChapter: 3, // 45 = 2 full chapters (40) + 5 into the 3rd
      levelInChapter: 5,
    })
  })

  it('promotes rank every 5 endless chapters, capping at the top rank', () => {
    expect(endlessProgress(STORY_LEVELS_PER_TIER)?.rank).toBe('Bronze') // endless chapter 1
    expect(endlessProgress(STORY_LEVELS_PER_TIER + LEVELS_PER_CHAPTER * 5)?.rank).toBe('Silver') // endless chapter 6
    expect(endlessProgress(STORY_LEVELS_PER_TIER + LEVELS_PER_CHAPTER * 9999)?.rank).toBe('Master V') // far future, capped
  })
})

/** Index that lands exactly on the boss (20th) level of the given 1-based endless chapter. */
function bossIndexForEndlessChapter(endlessChapter: number): number {
  return STORY_LEVELS_PER_TIER + (endlessChapter - 1) * LEVELS_PER_CHAPTER + (LEVELS_PER_CHAPTER - 1)
}

function modifiersAt(endlessChapter: number) {
  return modifiersForLevel(endlessProgress(bossIndexForEndlessChapter(endlessChapter)))
}

function countActive(m: ReturnType<typeof modifiersAt>): number {
  if (!m) return 0
  return Object.values(m).filter(Boolean).length
}

describe('modifiersForLevel', () => {
  it('is null for a non-boss endless level', () => {
    expect(modifiersForLevel(endlessProgress(STORY_LEVELS_PER_TIER))).toBeNull() // chapter 1, level 1
  })

  it('is null before Endless even starts', () => {
    expect(modifiersForLevel(endlessProgress(0))).toBeNull()
  })

  it('Bronze rank (chapters 1-5) alternates only Undo/Hints, one at a time', () => {
    expect(modifiersAt(1)).toEqual({ noUndo: true, noHints: false, timed: false, perfectRun: false })
    expect(modifiersAt(2)).toEqual({ noUndo: false, noHints: true, timed: false, perfectRun: false })
    expect(modifiersAt(3)).toEqual({ noUndo: true, noHints: false, timed: false, perfectRun: false })
    for (let ch = 1; ch <= 5; ch++) expect(countActive(modifiersAt(ch))).toBe(1)
  })

  it('Silver rank (chapters 6-10) introduces Timed into the rotation, still one at a time', () => {
    for (let ch = 6; ch <= 10; ch++) {
      const m = modifiersAt(ch)
      expect(countActive(m)).toBe(1)
      expect(m?.perfectRun).toBe(false) // not unlocked yet
    }
    expect(modifiersAt(6)?.timed).toBe(true) // first Silver boss lands on Timed
  })

  it('Gold rank (chapters 11-15) introduces Perfect Run, still one at a time', () => {
    for (let ch = 11; ch <= 15; ch++) expect(countActive(modifiersAt(ch))).toBe(1)
    expect(modifiersAt(12)?.perfectRun).toBe(true) // second Gold boss lands on Perfect Run
  })

  it('Diamond rank and above (chapter 16+) stacks exactly 2 modifiers, never more', () => {
    for (const ch of [16, 17, 25, 100]) {
      const m = modifiersAt(ch)
      expect(countActive(m)).toBe(2)
    }
  })
})

describe('modifierLabel', () => {
  it('describes each combination', () => {
    expect(modifierLabel({ noUndo: true, noHints: false, timed: false, perfectRun: false })).toBe('No Undo')
    expect(modifierLabel({ noUndo: false, noHints: true, timed: false, perfectRun: false })).toBe('No Hints')
    expect(modifierLabel({ noUndo: false, noHints: false, timed: true, perfectRun: false })).toBe('Timed')
    expect(modifierLabel({ noUndo: false, noHints: false, timed: false, perfectRun: true })).toBe('Perfect Run')
    expect(modifierLabel({ noUndo: true, noHints: true, timed: false, perfectRun: false })).toBe('No Undo · No Hints')
    expect(modifierLabel({ noUndo: false, noHints: false, timed: true, perfectRun: true })).toBe('Timed · Perfect Run')
  })
})
