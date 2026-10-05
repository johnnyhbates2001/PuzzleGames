import type { Difficulty, TangoLevelRecord } from '../engine/tango/types'
import { generateLevel } from '../engine/tango/generator'
import { getTangoProgress } from '../storage/db'
import { LEVELS_PER_CHAPTER, tierOffsetChapters } from './chapters'

export interface NextTangoLevelResult {
  level: TangoLevelRecord
  source: 'bank' | 'generated'
  bankIndex?: number
}

// Explicit per-difficulty static imports (rather than one dynamic template import) so
// Vite can statically analyze and code-split each bank into its own chunk — that chunk
// then lands in dist/ as an ordinary JS file, already covered by Workbox's default
// precache globs, with no extra PWA config needed to make it available offline.
async function loadBank(difficulty: Difficulty): Promise<TangoLevelRecord[]> {
  switch (difficulty) {
    case 'easy':
      return ((await import('../data/banks/tango-easy.json')).default as unknown) as TangoLevelRecord[]
    case 'medium':
      return ((await import('../data/banks/tango-medium.json')).default as unknown) as TangoLevelRecord[]
    case 'hard':
      return ((await import('../data/banks/tango-hard.json')).default as unknown) as TangoLevelRecord[]
  }
}

const GENERATE_RETRIES = 30

/** Picks the next level for a difficulty: the bank entry at the player's current index,
 *  falling back to runtime generation (via the same engine) once the bank is exhausted —
 *  this is what powers Endless mode (see games/chapters.ts), so this fallback needs to
 *  hold up under indefinite, repeated use, not just an occasional edge case. */
export async function getNextTangoLevel(difficulty: Difficulty): Promise<NextTangoLevelResult> {
  const [progress, bank] = await Promise.all([getTangoProgress(difficulty), loadBank(difficulty)])

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

export interface FreePlayTangoLevelResult {
  level: TangoLevelRecord
  source: 'bank' | 'generated'
}

/** Free Play's level source: always a fresh procedural puzzle, never the bank/
 *  currentLevelIndex progression that powers chapters — so solving it can't advance
 *  chapter or Endless progress. Same generate-with-retries approach as the bank-
 *  exhaustion fallback above, just invoked unconditionally instead of only once the
 *  bank runs out. */
export async function getFreePlayTangoLevel(difficulty: Difficulty): Promise<FreePlayTangoLevelResult> {
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
 *  CompleteRow — reuses the same bank chunk getNextTangoLevel already loads. */
export async function getChapterLevels(difficulty: Difficulty, chapterNumber: number): Promise<TangoLevelRecord[]> {
  const bank = await loadBank(difficulty)
  const chapterInTier = chapterNumber - 1 - tierOffsetChapters(difficulty)
  const start = chapterInTier * LEVELS_PER_CHAPTER
  return bank.slice(start, start + LEVELS_PER_CHAPTER)
}
