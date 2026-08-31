import type { Difficulty, ZipLevelRecord } from '../engine/zip/types'
import { generateLevel } from '../engine/zip/generator'
import { getZipProgress } from '../storage/db'

export interface NextZipLevelResult {
  level: ZipLevelRecord
  source: 'bank' | 'generated'
  bankIndex?: number
}

// Explicit per-difficulty static imports (rather than one dynamic template import) so
// Vite can statically analyze and code-split each bank into its own chunk — that chunk
// then lands in dist/ as an ordinary JS file, already covered by Workbox's default
// precache globs, with no extra PWA config needed to make it available offline.
async function loadBank(difficulty: Difficulty): Promise<ZipLevelRecord[]> {
  switch (difficulty) {
    case 'easy':
      return ((await import('../data/banks/zip-easy.json')).default as unknown) as ZipLevelRecord[]
    case 'medium':
      return ((await import('../data/banks/zip-medium.json')).default as unknown) as ZipLevelRecord[]
    case 'hard':
      return ((await import('../data/banks/zip-hard.json')).default as unknown) as ZipLevelRecord[]
  }
}

const GENERATE_RETRIES = 30

/** Picks the next level for a difficulty: the bank entry at the player's current index,
 *  falling back to runtime generation (via the same engine) once the bank is exhausted —
 *  this is what powers Endless mode (see games/chapters.ts), so this fallback needs to
 *  hold up under indefinite, repeated use, not just an occasional edge case. */
export async function getNextZipLevel(difficulty: Difficulty): Promise<NextZipLevelResult> {
  const [progress, bank] = await Promise.all([getZipProgress(difficulty), loadBank(difficulty)])

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

export interface FreePlayZipLevelResult {
  level: ZipLevelRecord
  source: 'bank' | 'generated'
}

/** Free Play's level source: always a fresh procedural puzzle, never the bank/
 *  currentLevelIndex progression that powers chapters — so solving it can't advance
 *  chapter or Endless progress. Same generate-with-retries approach as the bank-
 *  exhaustion fallback above, just invoked unconditionally instead of only once the
 *  bank runs out. */
export async function getFreePlayZipLevel(difficulty: Difficulty): Promise<FreePlayZipLevelResult> {
  for (let attempt = 0; attempt < GENERATE_RETRIES; attempt++) {
    const level = generateLevel(difficulty, Math.random)
    if (level) return { level, source: 'generated' }
  }
  const bank = await loadBank(difficulty)
  return { level: bank[Math.floor(Math.random() * bank.length)], source: 'bank' }
}
