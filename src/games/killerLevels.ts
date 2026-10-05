import type { Difficulty, KillerLevelRecord } from '../engine/killer/types'
import { generateLevel } from '../engine/killer/generator'
import { getKillerProgress } from '../storage/db'
import { LEVELS_PER_CHAPTER, tierOffsetChapters } from './chapters'

export interface NextKillerLevelResult {
  level: KillerLevelRecord
  source: 'bank' | 'generated'
  bankIndex?: number
}

// Explicit per-difficulty static imports (rather than one dynamic template import) so
// Vite can statically analyze and code-split each bank into its own chunk — that chunk
// then lands in dist/ as an ordinary JS file, already covered by Workbox's default
// precache globs, with no extra PWA config needed to make it available offline.
async function loadBank(difficulty: Difficulty): Promise<KillerLevelRecord[]> {
  switch (difficulty) {
    case 'easy':
      return ((await import('../data/banks/killer-easy.json')).default as unknown) as KillerLevelRecord[]
    case 'medium':
      return ((await import('../data/banks/killer-medium.json')).default as unknown) as KillerLevelRecord[]
    case 'hard':
      return ((await import('../data/banks/killer-hard.json')).default as unknown) as KillerLevelRecord[]
  }
}

const GENERATE_RETRIES = 30

/** Picks the next level for a difficulty: the bank entry at the player's current index,
 *  falling back to runtime generation (via the same engine) once the bank is exhausted —
 *  this is what powers Endless mode (see games/chapters.ts), so this fallback needs to
 *  hold up under indefinite, repeated use, not just an occasional edge case. */
export async function getNextKillerLevel(difficulty: Difficulty): Promise<NextKillerLevelResult> {
  const [progress, bank] = await Promise.all([getKillerProgress(difficulty), loadBank(difficulty)])

  if (progress.currentLevelIndex < bank.length) {
    return { level: bank[progress.currentLevelIndex], source: 'bank', bankIndex: progress.currentLevelIndex }
  }

  for (let attempt = 0; attempt < GENERATE_RETRIES; attempt++) {
    const level = generateLevel(difficulty, Math.random)
    if (level) return { level, source: 'generated' }
  }
  // Endless mode must never throw a player out mid-session — on the astronomically
  // unlikely chance every attempt fails at this already-verified difficulty size, fall
  // back to replaying a random bank level rather than crashing.
  return { level: bank[Math.floor(Math.random() * bank.length)], source: 'bank' }
}

export interface FreePlayKillerLevelResult {
  level: KillerLevelRecord
  source: 'bank' | 'generated'
}

/** Free Play's level source: always a fresh procedural puzzle, never the bank/
 *  currentLevelIndex progression that powers chapters — so solving it can't advance
 *  chapter or Endless progress. Same generate-with-retries approach as the bank-
 *  exhaustion fallback above, just invoked unconditionally instead of only once the
 *  bank runs out. */
export async function getFreePlayKillerLevel(difficulty: Difficulty): Promise<FreePlayKillerLevelResult> {
  for (let attempt = 0; attempt < GENERATE_RETRIES; attempt++) {
    const level = generateLevel(difficulty, Math.random)
    if (level) return { level, source: 'generated' }
  }
  const bank = await loadBank(difficulty)
  return { level: bank[Math.floor(Math.random() * bank.length)], source: 'bank' }
}

/** Every level in one story chapter, in order — always all 20, since every chapter
 *  is fully bank-sourced (each bank has exactly LEVELS_PER_CHAPTER * that tier's
 *  chapter count; see games/chapters.ts). Powers "replay this chapter" from ChaptersPage's
 *  CompleteRow — reuses the same bank chunk getNextKillerLevel already loads. */
export async function getChapterLevels(difficulty: Difficulty, chapterNumber: number): Promise<KillerLevelRecord[]> {
  const bank = await loadBank(difficulty)
  const chapterInTier = chapterNumber - 1 - tierOffsetChapters(difficulty)
  const start = chapterInTier * LEVELS_PER_CHAPTER
  return bank.slice(start, start + LEVELS_PER_CHAPTER)
}
