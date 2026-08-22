/**
 * Build-time level bank generator.
 *
 * Pre-generates a verified bank of unique-solution Zip levels per difficulty, writing
 * src/data/banks/zip-{easy,medium,hard}.json. Run via `npm run gen:zip-banks`.
 *
 * Safeguards (see src/engine/zip/generator.ts for the generation algorithm itself):
 *  - the solver's own node cap bounds any single uniqueness check
 *  - a per-difficulty wall-clock budget stops the script from hanging indefinitely;
 *    if a bank ends up short of its target, the script exits non-zero so it's
 *    visible rather than silently incomplete
 *  - duplicate puzzles (exact checkpoint+wall layout) are skipped
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateLevel } from '../src/engine/zip/generator.ts'
import { mulberry32 } from '../src/engine/rng.ts'
import type { Difficulty, ZipLevelRecord } from '../src/engine/zip/types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', 'banks')

const TARGET_PER_DIFFICULTY = 200
const WALL_CLOCK_BUDGET_MS = 5 * 60 * 1000
const PROGRESS_EVERY = 25
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

function generateBank(difficulty: Difficulty, seed: number): ZipLevelRecord[] {
  const rng = mulberry32(seed)
  const levels: ZipLevelRecord[] = []
  const seenHashes = new Set<string>()
  const start = Date.now()
  let attempts = 0

  while (levels.length < TARGET_PER_DIFFICULTY) {
    if (Date.now() - start > WALL_CLOCK_BUDGET_MS) {
      console.warn(
        `[gen:zip-banks] ${difficulty}: wall-clock budget exceeded after ${attempts} attempts — ` +
          `stopping with ${levels.length}/${TARGET_PER_DIFFICULTY} levels`,
      )
      break
    }
    attempts++
    const level = generateLevel(difficulty, rng)
    if (!level) continue

    const hash = JSON.stringify({ cp: level.checkpoints, w: level.walls })
    if (seenHashes.has(hash)) continue
    seenHashes.add(hash)
    levels.push(level)

    if (levels.length % PROGRESS_EVERY === 0) {
      const elapsedS = ((Date.now() - start) / 1000).toFixed(1)
      console.log(
        `[gen:zip-banks] ${difficulty}: ${levels.length}/${TARGET_PER_DIFFICULTY} (${elapsedS}s elapsed, ${attempts} attempts)`,
      )
    }
  }

  const elapsedS = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`[gen:zip-banks] ${difficulty}: done — ${levels.length}/${TARGET_PER_DIFFICULTY} levels in ${elapsedS}s (${attempts} attempts)`)
  return levels
}

mkdirSync(OUTPUT_DIR, { recursive: true })

let anyShort = false
for (let i = 0; i < DIFFICULTIES.length; i++) {
  const difficulty = DIFFICULTIES[i]
  const levels = generateBank(difficulty, 30_000 + i)
  if (levels.length < TARGET_PER_DIFFICULTY) anyShort = true

  const outPath = join(OUTPUT_DIR, `zip-${difficulty}.json`)
  writeFileSync(outPath, JSON.stringify(levels))
  console.log(`[gen:zip-banks] wrote ${outPath} (${levels.length} levels)`)
}

if (anyShort) {
  console.error('[gen:zip-banks] one or more banks are short of their target count — see warnings above')
  process.exit(1)
}
