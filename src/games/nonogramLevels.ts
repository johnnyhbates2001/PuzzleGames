import type { Difficulty, NonogramLevelRecord } from '../engine/nonogram/types'
import { generateLevel } from '../engine/nonogram/generator'
import { getNonogramProgress } from '../storage/db'

export interface NextNonogramLevelResult {
  level: NonogramLevelRecord
  source: 'bank' | 'generated'
  bankIndex?: number
}

// Explicit per-difficulty static imports (rather than one dynamic template import) so
// Vite can statically analyze and code-split each bank into its own chunk — that chunk
// then lands in dist/ as an ordinary JS file, already covered by Workbox's default
// precache globs, with no extra PWA config needed to make it available offline.
async function loadBank(difficulty: Difficulty): Promise<NonogramLevelRecord[]> {
  switch (difficulty) {
    case 'easy':
      return ((await import('../data/banks/nonogram-easy.json')).default as unknown) as NonogramLevelRecord[]
    case 'medium':
      return ((await import('../data/banks/nonogram-medium.json')).default as unknown) as NonogramLevelRecord[]
    case 'hard':
      return ((await import('../data/banks/nonogram-hard.json')).default as unknown) as NonogramLevelRecord[]
  }
}

const GENERATE_RETRIES = 30

/** Picks the next level for a difficulty: the bank entry at the player's current index,
 *  falling back to runtime generation (via the same engine) once the bank is exhausted —
 *  this is what powers Endless mode (see games/chapters.ts), so this fallback needs to
 *  hold up under indefinite, repeated use, not just an occasional edge case. Nonogram's
 *  generator is rejection-sampling based and has the lowest per-attempt hit rate of the
 *  five engines, which is exactly why this path needs a guaranteed-safe last resort. */
export async function getNextNonogramLevel(difficulty: Difficulty): Promise<NextNonogramLevelResult> {
  const [progress, bank] = await Promise.all([getNonogramProgress(difficulty), loadBank(difficulty)])

  if (progress.currentLevelIndex < bank.length) {
    return { level: bank[progress.currentLevelIndex], source: 'bank', bankIndex: progress.currentLevelIndex }
  }

  for (let attempt = 0; attempt < GENERATE_RETRIES; attempt++) {
    const level = generateLevel(difficulty, Math.random)
    if (level) return { level, source: 'generated' }
  }
  // Endless mode must never throw a player out mid-session — on the chance every
  // attempt fails at this already-verified difficulty size, fall back to replaying a
  // random bank level rather than crashing.
  return { level: bank[Math.floor(Math.random() * bank.length)], source: 'bank' }
}
