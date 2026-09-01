import type { Difficulty, WordleLevelRecord } from '../engine/wordle/types'
import { generateLevel } from '../engine/wordle/generator'
import { getWordleProgress } from '../storage/db'
import { CHAPTERS_PER_TIER, LEVELS_PER_CHAPTER } from './chapters'

export interface NextWordleLevelResult {
  level: WordleLevelRecord
  source: 'bank' | 'generated'
  bankIndex?: number
}

// Explicit per-difficulty static imports (rather than one dynamic template import) so
// Vite can statically analyze and code-split each bank into its own chunk — that chunk
// then lands in dist/ as an ordinary JS file, already covered by Workbox's default
// precache globs, with no extra PWA config needed to make it available offline.
async function loadBank(difficulty: Difficulty): Promise<WordleLevelRecord[]> {
  switch (difficulty) {
    case 'easy':
      return ((await import('../data/banks/wordle-easy.json')).default as unknown) as WordleLevelRecord[]
    case 'medium':
      return ((await import('../data/banks/wordle-medium.json')).default as unknown) as WordleLevelRecord[]
    case 'hard':
      return ((await import('../data/banks/wordle-hard.json')).default as unknown) as WordleLevelRecord[]
  }
}

/** The full curated answer pool (2315 words) — every bank above is a disjoint 200-word
 *  slice of this same pool (see scripts/generate-wordle-banks.ts); this is what backs
 *  Endless mode and Free Play once/instead of drawing from a bank. */
export async function loadAnswerPool(): Promise<string[]> {
  return ((await import('../data/wordleAnswers.json')).default as unknown) as string[]
}

/** Every word a player may type as a guess — the answer pool plus ~12,500 additional
 *  real words that are never solutions themselves (see scripts/generate-wordle-banks.ts). */
export async function loadGuessDictionary(): Promise<Set<string>> {
  const words = ((await import('../data/wordleGuesses.json')).default as unknown) as string[]
  return new Set(words)
}

/** Picks the next level for a difficulty: the bank entry at the player's current index,
 *  falling back to a random pick from the full answer pool once the bank is exhausted —
 *  this is what powers Endless mode (see games/chapters.ts). Unlike the grid games'
 *  generator, this can't fail (there's always a word to pick), so there's no retry loop. */
export async function getNextWordleLevel(difficulty: Difficulty): Promise<NextWordleLevelResult> {
  const [progress, bank] = await Promise.all([getWordleProgress(difficulty), loadBank(difficulty)])

  if (progress.currentLevelIndex < bank.length) {
    return { level: bank[progress.currentLevelIndex], source: 'bank', bankIndex: progress.currentLevelIndex }
  }

  const pool = await loadAnswerPool()
  return { level: generateLevel(difficulty, Math.random, pool), source: 'generated' }
}

export interface FreePlayWordleLevelResult {
  level: WordleLevelRecord
  source: 'bank' | 'generated'
}

/** Free Play's level source: always a fresh random word, never the bank/
 *  currentLevelIndex progression that powers chapters — so solving it can't advance
 *  chapter or Endless progress. */
export async function getFreePlayWordleLevel(difficulty: Difficulty): Promise<FreePlayWordleLevelResult> {
  const pool = await loadAnswerPool()
  return { level: generateLevel(difficulty, Math.random, pool), source: 'generated' }
}

/** Every level in one story chapter, in order — always all 20, since every chapter
 *  (10 per difficulty tier) is fully bank-sourced (each bank has exactly 200 levels;
 *  see games/chapters.ts). Powers "replay this chapter" from ChaptersPage's
 *  CompleteRow — reuses the same bank chunk getNextWordleLevel already loads. */
export async function getChapterLevels(difficulty: Difficulty, chapterNumber: number): Promise<WordleLevelRecord[]> {
  const bank = await loadBank(difficulty)
  const chapterInTier = (chapterNumber - 1) % CHAPTERS_PER_TIER
  const start = chapterInTier * LEVELS_PER_CHAPTER
  return bank.slice(start, start + LEVELS_PER_CHAPTER)
}
