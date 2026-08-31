import type { Difficulty } from '../engine/types'
import { getProgress, getSudokuProgress, getZipProgress, getPatchesProgress, getNonogramProgress } from '../storage/db'

export const LEVELS_PER_CHAPTER = 20
export const CHAPTERS_PER_TIER = 10
export const TOTAL_STORY_CHAPTERS = CHAPTERS_PER_TIER * 3

export interface ChapterMeta {
  name: string
  /** Set only for milestone chapters (every 3rd) — the skin id granted on completion. */
  skinId?: string
}

// Shared across all 5 games to keep initial content-authoring low — each game can
// diverge later. Index 0 = chapter 1.
export const CHAPTER_META: ChapterMeta[] = [
  { name: 'First Steps' },
  { name: 'Morning Light' },
  { name: 'Garden Path', skinId: 'garden' },
  { name: 'Quiet Pond' },
  { name: 'Sunny Meadow' },
  { name: 'River Bend', skinId: 'river' },
  { name: 'Wildflower Field' },
  { name: 'Hilltop View' },
  { name: 'Golden Hour', skinId: 'golden-hour' },
  { name: "Journey's Start" },
  { name: 'Open Road' },
  { name: 'Desert Bloom', skinId: 'desert-bloom' },
  { name: 'Canyon Trail' },
  { name: 'Cactus Flat' },
  { name: 'Starlit Camp', skinId: 'starlit' },
  { name: 'Mountain Pass' },
  { name: 'Cloud Break' },
  { name: 'Alpine Lake', skinId: 'alpine' },
  { name: 'Ridge Line' },
  { name: 'Summit Approach' },
  { name: 'Molten Core', skinId: 'molten' },
  { name: 'Volcanic Field' },
  { name: 'Ember Ridge' },
  { name: 'Thunderhead', skinId: 'thunderhead' },
  { name: 'Storm Front' },
  { name: 'Iron Peaks' },
  { name: 'Aurora Sky', skinId: 'aurora' },
  { name: "Glacier's Edge" },
  { name: 'Frozen Reach' },
  { name: 'The Summit', skinId: 'summit' },
]

function tierOffsetChapters(difficulty: Difficulty): number {
  return { easy: 0, medium: CHAPTERS_PER_TIER, hard: CHAPTERS_PER_TIER * 2 }[difficulty]
}

export function difficultyForChapter(chapterNumber: number): Difficulty {
  const tier = Math.min(Math.floor((chapterNumber - 1) / CHAPTERS_PER_TIER), 2)
  return (['easy', 'medium', 'hard'] as const)[tier]
}

/** Derives chapter position from a difficulty's existing `currentLevelIndex` counter —
 *  no separate chapter-progress storage needed. `tierLocalIndex` past the tier's 200
 *  levels (i.e. already in Endless territory) clamps to that tier's final chapter. */
export function chapterForIndex(
  tierLocalIndex: number,
  difficulty: Difficulty,
): { chapterNumber: number; levelInChapter: number; isBoss: boolean } {
  const clamped = Math.max(0, Math.min(tierLocalIndex, LEVELS_PER_CHAPTER * CHAPTERS_PER_TIER - 1))
  const chapterInTier = Math.floor(clamped / LEVELS_PER_CHAPTER)
  const levelInChapter = clamped - chapterInTier * LEVELS_PER_CHAPTER
  return {
    chapterNumber: tierOffsetChapters(difficulty) + chapterInTier + 1,
    levelInChapter,
    isBoss: levelInChapter === LEVELS_PER_CHAPTER - 1,
  }
}

/** How many chapters within one difficulty tier are fully completed (0-10). */
export function chaptersCompletedInTier(currentLevelIndex: number): number {
  return Math.min(Math.floor(currentLevelIndex / LEVELS_PER_CHAPTER), CHAPTERS_PER_TIER)
}

export type ChapterStatus = 'locked' | 'current' | 'complete'

export interface ChapterNodeState {
  chapterNumber: number
  meta: ChapterMeta
  difficulty: Difficulty
  status: ChapterStatus
  /** 0-20. Only meaningful for 'current' (levels done so far) — 20 when 'complete'. */
  levelInChapter: number
}

const TIER_ORDER: Difficulty[] = ['easy', 'medium', 'hard']
export const STORY_LEVELS_PER_TIER = LEVELS_PER_CHAPTER * CHAPTERS_PER_TIER

/** Builds all 30 chapter node states for one game from its 3 difficulty progress
 *  counters — the chapter map's entire data model, purely derived, no new storage.
 *  Each tier's own counter independently starts at 0, so a later tier (medium/hard)
 *  must additionally be gated behind every earlier tier being fully finished — without
 *  that check, chapter 11 (medium's first) and chapter 21 (hard's first) would both
 *  read as immediately playable on a fresh profile, alongside chapter 1. */
export function buildChapterNodes(currentLevelIndexByDifficulty: Record<Difficulty, number>): ChapterNodeState[] {
  const nodes: ChapterNodeState[] = []
  for (let chapterNumber = 1; chapterNumber <= TOTAL_STORY_CHAPTERS; chapterNumber++) {
    const difficulty = difficultyForChapter(chapterNumber)
    const tierPosition = TIER_ORDER.indexOf(difficulty)
    const earlierTiersComplete = TIER_ORDER.slice(0, tierPosition).every(
      (d) => currentLevelIndexByDifficulty[d] >= STORY_LEVELS_PER_TIER,
    )
    const chapterInTier = (chapterNumber - 1) % CHAPTERS_PER_TIER
    const start = chapterInTier * LEVELS_PER_CHAPTER
    const end = start + LEVELS_PER_CHAPTER
    const tierIndex = currentLevelIndexByDifficulty[difficulty]
    let status: ChapterStatus
    let levelInChapter: number
    if (!earlierTiersComplete) {
      status = 'locked'
      levelInChapter = 0
    } else if (tierIndex >= end) {
      status = 'complete'
      levelInChapter = LEVELS_PER_CHAPTER
    } else if (tierIndex >= start) {
      status = 'current'
      levelInChapter = tierIndex - start
    } else {
      status = 'locked'
      levelInChapter = 0
    }
    nodes.push({ chapterNumber, meta: CHAPTER_META[chapterNumber - 1], difficulty, status, levelInChapter })
  }
  return nodes
}

const ALL_PROGRESS_GETTERS = [getProgress, getSudokuProgress, getZipProgress, getPatchesProgress, getNonogramProgress]
const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

/** Highest story chapter number completed across every game/difficulty — used for the
 *  chapter-gated skin unlocks in the Shop. Skins are a shared, cross-game cosmetic (not
 *  per-game), so a milestone unlocks the moment ANY game reaches it. */
export async function getHighestChapterCompleted(): Promise<number> {
  const results = await Promise.all(ALL_PROGRESS_GETTERS.flatMap((getter) => ALL_DIFFICULTIES.map((d) => getter(d))))
  return results.reduce((max, p) => {
    // A tier with zero chapters completed contributes nothing — without this guard, an
    // untouched medium/hard row would still add its tier offset (10/20) to the max,
    // reporting chapters as "completed" purely because that tier is numerically later,
    // even on a completely fresh profile.
    const completedInTier = chaptersCompletedInTier(p.currentLevelIndex)
    return completedInTier === 0 ? max : Math.max(max, tierOffsetChapters(p.difficulty) + completedInTier)
  }, 0)
}

// Endless mode: once hard's own 200-level story spine (chapters 21-30) is finished,
// hard's currentLevelIndex keeps counting up forever via the same bank-exhaustion
// fallback that already existed (see getNextLevel in games/queensLevels.ts and its
// siblings) — so, like every story-chapter position above, Endless progress is a pure
// derivation of that one counter. No size escalation: DIFFICULTY_SIZE's own comment
// documents that 8x8 is already right at Apple's 44pt tap-target minimum on the
// smallest supported iPhone, so growing the grid further would regress usability on
// that device. Endless variety comes from fresh procedural puzzles and rank alone.
const RANKS = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Master I', 'Master II', 'Master III', 'Master IV', 'Master V']
const CHAPTERS_PER_RANK = 5

export interface EndlessProgress {
  /** 1-based — "Endless Chapter 1" is the first batch of 20 levels past the story. */
  endlessChapter: number
  /** 0-19, levels completed so far in the current endless chapter. */
  levelInChapter: number
  rank: string
  /** True when the level about to be played is the 20th of its endless chapter —
   *  mirrors chapterForIndex's isBoss. Boss levels are where modifiers apply. */
  isBoss: boolean
}

/** Null until hard's story spine (STORY_LEVELS_PER_TIER levels) is actually finished. */
export function endlessProgress(hardCurrentLevelIndex: number): EndlessProgress | null {
  if (hardCurrentLevelIndex < STORY_LEVELS_PER_TIER) return null
  const endlessLevelIndex = hardCurrentLevelIndex - STORY_LEVELS_PER_TIER
  const endlessChapterIndex = Math.floor(endlessLevelIndex / LEVELS_PER_CHAPTER)
  const levelInChapter = endlessLevelIndex - endlessChapterIndex * LEVELS_PER_CHAPTER
  const rank = RANKS[Math.min(Math.floor(endlessChapterIndex / CHAPTERS_PER_RANK), RANKS.length - 1)]
  return {
    endlessChapter: endlessChapterIndex + 1,
    levelInChapter,
    rank,
    isBoss: levelInChapter === LEVELS_PER_CHAPTER - 1,
  }
}

export interface LevelModifiers {
  noUndo: boolean
  noHints: boolean
  timed: boolean
  perfectRun: boolean
}

const ALL_MODIFIER_KEYS = ['noUndo', 'noHints', 'timed', 'perfectRun'] as const
type ModifierKey = (typeof ALL_MODIFIER_KEYS)[number]

const MODIFIER_LABELS: Record<ModifierKey, string> = {
  noUndo: 'No Undo',
  noHints: 'No Hints',
  timed: 'Timed',
  perfectRun: 'Perfect Run',
}

/** Which modifiers are available at a given rank — new ones unlock as rank climbs, so
 *  ranking up brings its own twist instead of dumping everything on the player at once.
 *  rankIndex is RANKS' own index (0 = Bronze, 1 = Silver, 2 = Gold, 3+ = Diamond...). */
function modifierPoolForRankIndex(rankIndex: number): readonly ModifierKey[] {
  if (rankIndex === 0) return ['noUndo', 'noHints'] // Bronze
  if (rankIndex === 1) return ['noUndo', 'noHints', 'timed'] // Silver
  return ALL_MODIFIER_KEYS // Gold and above
}

/** How many modifiers stack at once on a boss level — capped at 2 (never all 4) so
 *  higher ranks stay a real spike in difficulty rather than becoming unfair. */
function activeModifierCount(rankIndex: number): 1 | 2 {
  return rankIndex >= 3 ? 2 : 1 // Diamond rank onward
}

/** Endless boss levels (the 20th of every endless chapter) run under 1-2 modifiers,
 *  cycling deterministically through whichever pool this rank has unlocked. */
export function modifiersForLevel(endless: EndlessProgress | null): LevelModifiers | null {
  if (!endless || !endless.isBoss) return null
  const chapterIndex0 = endless.endlessChapter - 1
  const rankIndex = Math.min(Math.floor(chapterIndex0 / CHAPTERS_PER_RANK), RANKS.length - 1)
  const pool = modifierPoolForRankIndex(rankIndex)
  const count = activeModifierCount(rankIndex)
  const active = new Set<ModifierKey>()
  for (let i = 0; i < count; i++) {
    active.add(pool[(chapterIndex0 + i) % pool.length])
  }
  return {
    noUndo: active.has('noUndo'),
    noHints: active.has('noHints'),
    timed: active.has('timed'),
    perfectRun: active.has('perfectRun'),
  }
}

export function modifierLabel(modifiers: LevelModifiers): string {
  return ALL_MODIFIER_KEYS.filter((key) => modifiers[key])
    .map((key) => MODIFIER_LABELS[key])
    .join(' · ')
}
