/**
 * Build-time level bank generator.
 *
 * Pre-generates a verified bank of unique-solution Patches levels per difficulty,
 * writing src/data/banks/patches-{easy,medium,hard}.json. Run via `npm run gen:patches-banks`.
 *
 * Safeguards (see src/engine/patches/generator.ts for the generation algorithm itself):
 *  - the solver's own node cap bounds any single uniqueness check
 *  - a per-difficulty wall-clock budget stops the script from hanging indefinitely;
 *    if a bank ends up short of its target, the script exits non-zero so it's
 *    visible rather than silently incomplete
 *  - duplicate puzzles (exact clue layout) are skipped
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateLevel } from '../src/engine/patches/generator.ts'
import { mulberry32 } from '../src/engine/rng.ts'
import type { Difficulty, PatchesLevelRecord } from '../src/engine/patches/types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', 'banks')

const TARGET_PER_DIFFICULTY = 200
const WALL_CLOCK_BUDGET_MS = 3 * 60 * 1000
const PROGRESS_EVERY = 25
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

function generateBank(difficulty: Difficulty, seed: number): PatchesLevelRecord[] {
  const rng = mulberry32(seed)
  const levels: PatchesLevelRecord[] = []
  const seenHashes = new Set<string>()
  const start = Date.now()
  let attempts = 0

  while (levels.length < TARGET_PER_DIFFICULTY) {
    if (Date.now() - start > WALL_CLOCK_BUDGET_MS) {
      console.warn(
        `[gen:patches-banks] ${difficulty}: wall-clock budget exceeded after ${attempts} attempts — ` +
          `stopping with ${levels.length}/${TARGET_PER_DIFFICULTY} levels`,
      )
      break
    }
    attempts++
    const level = generateLevel(difficulty, rng)
    if (!level) continue

    const hash = JSON.stringify(level.clues)
    if (seenHashes.has(hash)) continue
    seenHashes.add(hash)
    levels.push(level)

    if (levels.length % PROGRESS_EVERY === 0) {
      const elapsedS = ((Date.now() - start) / 1000).toFixed(1)
      console.log(
        `[gen:patches-banks] ${difficulty}: ${levels.length}/${TARGET_PER_DIFFICULTY} (${elapsedS}s elapsed, ${attempts} attempts)`,
      )
    }
  }

  const elapsedS = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`[gen:patches-banks] ${difficulty}: done — ${levels.length}/${TARGET_PER_DIFFICULTY} levels in ${elapsedS}s (${attempts} attempts)`)
  return levels
}

mkdirSync(OUTPUT_DIR, { recursive: true })

let anyShort = false
for (let i = 0; i < DIFFICULTIES.length; i++) {
  const difficulty = DIFFICULTIES[i]
  const levels = generateBank(difficulty, 40_000 + i)
  if (levels.length < TARGET_PER_DIFFICULTY) anyShort = true

  const outPath = join(OUTPUT_DIR, `patches-${difficulty}.json`)
  writeFileSync(outPath, JSON.stringify(levels))
  console.log(`[gen:patches-banks] wrote ${outPath} (${levels.length} levels)`)
}

if (anyShort) {
  console.error('[gen:patches-banks] one or more banks are short of their target count — see warnings above')
  process.exit(1)
}
