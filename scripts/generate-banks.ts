/**
 * Build-time level bank generator.
 *
 * Pre-generates a verified bank of unique-solution Queens levels per difficulty,
 * writing src/data/banks/{easy,medium,hard}.json. Run via `npm run gen:banks`.
 *
 * Safeguards (see src/engine/generator.ts for the generation algorithm itself):
 *  - the solver's own node cap bounds any single uniqueness check
 *  - a per-difficulty wall-clock budget stops the script from hanging indefinitely;
 *    if a bank ends up short of its target, the script exits non-zero so it's
 *    visible rather than silently incomplete
 *  - duplicate region layouts (exact JSON match) are skipped
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateLevel } from '../src/engine/generator.ts'
import { mulberry32 } from '../src/engine/rng.ts'
import type { Difficulty, LevelRecord } from '../src/engine/types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', 'banks')

const TARGET_PER_DIFFICULTY: Record<Difficulty, number> = { easy: 200, medium: 300, hard: 500 }
const WALL_CLOCK_BUDGET_MS: Record<Difficulty, number> = { easy: 3 * 60 * 1000, medium: 6 * 60 * 1000, hard: 12 * 60 * 1000 }
const PROGRESS_EVERY = 25
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

function generateBank(difficulty: Difficulty, seed: number): LevelRecord[] {
  const target = TARGET_PER_DIFFICULTY[difficulty]
  const rng = mulberry32(seed)
  const levels: LevelRecord[] = []
  const seenRegionHashes = new Set<string>()
  const start = Date.now()
  let attempts = 0

  while (levels.length < target) {
    if (Date.now() - start > WALL_CLOCK_BUDGET_MS[difficulty]) {
      console.warn(
        `[gen:banks] ${difficulty}: wall-clock budget exceeded after ${attempts} attempts — ` +
          `stopping with ${levels.length}/${target} levels`,
      )
      break
    }
    attempts++
    const level = generateLevel(difficulty, rng)
    if (!level) continue

    const hash = JSON.stringify(level.regions)
    if (seenRegionHashes.has(hash)) continue
    seenRegionHashes.add(hash)
    levels.push(level)

    if (levels.length % PROGRESS_EVERY === 0) {
      const elapsedS = ((Date.now() - start) / 1000).toFixed(1)
      console.log(
        `[gen:banks] ${difficulty}: ${levels.length}/${target} (${elapsedS}s elapsed, ${attempts} attempts)`,
      )
    }
  }

  const elapsedS = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`[gen:banks] ${difficulty}: done — ${levels.length}/${target} levels in ${elapsedS}s (${attempts} attempts)`)
  return levels
}

mkdirSync(OUTPUT_DIR, { recursive: true })

let anyShort = false
for (let i = 0; i < DIFFICULTIES.length; i++) {
  const difficulty = DIFFICULTIES[i]
  const levels = generateBank(difficulty, 10_000 + i)
  if (levels.length < TARGET_PER_DIFFICULTY[difficulty]) anyShort = true

  const outPath = join(OUTPUT_DIR, `${difficulty}.json`)
  writeFileSync(outPath, JSON.stringify(levels))
  console.log(`[gen:banks] wrote ${outPath} (${levels.length} levels)`)
}

if (anyShort) {
  console.error('[gen:banks] one or more banks are short of their target count — see warnings above')
  process.exit(1)
}
