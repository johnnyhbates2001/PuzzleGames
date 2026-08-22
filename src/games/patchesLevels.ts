import type { Difficulty, PatchesLevelRecord } from '../engine/patches/types'
import { generateLevel } from '../engine/patches/generator'
import { getPatchesProgress } from '../storage/db'

export interface NextPatchesLevelResult {
  level: PatchesLevelRecord
  source: 'bank' | 'generated'
  bankIndex?: number
}

// Explicit per-difficulty static imports (rather than one dynamic template import) so
// Vite can statically analyze and code-split each bank into its own chunk — that chunk
// then lands in dist/ as an ordinary JS file, already covered by Workbox's default
// precache globs, with no extra PWA config needed to make it available offline.
async function loadBank(difficulty: Difficulty): Promise<PatchesLevelRecord[]> {
  switch (difficulty) {
    case 'easy':
      return ((await import('../data/banks/patches-easy.json')).default as unknown) as PatchesLevelRecord[]
    case 'medium':
      return ((await import('../data/banks/patches-medium.json')).default as unknown) as PatchesLevelRecord[]
    case 'hard':
      return ((await import('../data/banks/patches-hard.json')).default as unknown) as PatchesLevelRecord[]
  }
}

const GENERATE_RETRIES = 5

/** Picks the next level for a difficulty: the bank entry at the player's current index,
 *  falling back to runtime generation (via the same engine) once the bank is exhausted. */
export async function getNextPatchesLevel(difficulty: Difficulty): Promise<NextPatchesLevelResult> {
  const [progress, bank] = await Promise.all([getPatchesProgress(difficulty), loadBank(difficulty)])

  if (progress.currentLevelIndex < bank.length) {
    return { level: bank[progress.currentLevelIndex], source: 'bank', bankIndex: progress.currentLevelIndex }
  }

  for (let attempt = 0; attempt < GENERATE_RETRIES; attempt++) {
    const level = generateLevel(difficulty, Math.random)
    if (level) return { level, source: 'generated' }
  }
  throw new Error(`Failed to generate a ${difficulty} patches level`)
}
