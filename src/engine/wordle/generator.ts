import type { Rng } from '../rng'
import type { Difficulty, WordleLevelRecord } from './types'

/** Unlike the grid games, there's nothing to procedurally construct or verify here —
 *  the "puzzle" is just a real word, and every word in `pool` already is one (see
 *  scripts/generate-wordle-banks.ts). This just picks one, which is what powers
 *  Endless mode, Free Play, and the Daily Challenge once the pre-built bank (see
 *  games/wordleLevels.ts) is exhausted or bypassed. */
export function generateLevel(difficulty: Difficulty, rng: Rng, pool: readonly string[]): WordleLevelRecord {
  const answer = pool[Math.floor(rng() * pool.length)]
  return { id: `wordle-generated-${difficulty}-${answer}-${Math.floor(rng() * 1e9)}`, difficulty, answer }
}
