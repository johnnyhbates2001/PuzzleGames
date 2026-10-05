/**
 * Build-time level bank generator.
 *
 * Pre-generates a verified bank of unique-solution, logic-solvable Tango levels per difficulty,
 * writing src/data/banks/tango-{easy,medium,hard}.json. Run via `npm run gen:tango-banks`.
 *
 * Safeguards (see src/engine/tango/generator.ts for the generation algorithm itself):
 *  - the solver's own node cap bounds any single uniqueness check
 *  - a per-difficulty wall-clock budget stops the script from hanging indefinitely;
 *    if a bank ends up short of its target, the script exits non-zero so it's
 *    visible rather than silently incomplete
 *  - duplicate puzzles (exact JSON match) are skipped
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mulberry32 } from '../src/engine/rng.ts'
import { generateLevel } from '../src/engine/tango/generator.ts'
import type { Difficulty, TangoLevelRecord } from '../src/engine/tango/types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', 'banks')

const TARGET_PER_DIFFICULTY: Record<Difficulty, number> = { easy: 200, medium: 300, hard: 500 }
const WALL_CLOCK_BUDGET_MS: Record<Difficulty, number> = { easy: 3 * 60 * 1000, medium: 6 * 60 * 1000, hard: 12 * 60 * 1000 }
const PROGRESS_EVERY = 25
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

function generateBank(difficulty: Difficulty, seed: number): TangoLevelRecord[] {
  const target = TARGET_PER_DIFFICULTY[difficulty]
  const rng = mulberry32(seed)
  const levels: TangoLevelRecord[] = []
  const seenPuzzleHashes = new Set<string>()
  const start = Date.now()
  let attempts = 0

  while (levels.length < target) {
    if (Date.now() - start > WALL_CLOCK_BUDGET_MS[difficulty]) {
      console.warn(
        `[gen:tango-banks] ${difficulty}: wall-clock budget exceeded after ${attempts} attempts — ` +
          `stopping with ${levels.length}/${target} levels`,
      )
      break
    }
    attempts++
    const level = generateLevel(difficulty, rng)
    if (!level) continue

    const hash = JSON.stringify([level.givens, level.edges])
    if (seenPuzzleHashes.has(hash)) continue
    seenPuzzleHashes.add(hash)
    levels.push(level)

    if (levels.length % PROGRESS_EVERY === 0) {
      const elapsedS = ((Date.now() - start) / 1000).toFixed(1)
      console.log(
        `[gen:tango-banks] ${difficulty}: ${levels.length}/${target} (${elapsedS}s elapsed, ${attempts} attempts)`,
      )
    }
  }

  const elapsedS = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`[gen:tango-banks] ${difficulty}: done — ${levels.length}/${target} levels in ${elapsedS}s (${attempts} attempts)`)
  return levels
}

mkdirSync(OUTPUT_DIR, { recursive: true })

let anyShort = false
for (let i = 0; i < DIFFICULTIES.length; i++) {
  const difficulty = DIFFICULTIES[i]
  const levels = generateBank(difficulty, 50_000 + i)
  if (levels.length < TARGET_PER_DIFFICULTY[difficulty]) anyShort = true

  const outPath = join(OUTPUT_DIR, `tango-${difficulty}.json`)
  writeFileSync(outPath, JSON.stringify(levels))
  console.log(`[gen:tango-banks] wrote ${outPath} (${levels.length} levels)`)
}

if (anyShort) {
  console.error('[gen:tango-banks] one or more banks are short of their target count — see warnings above')
  process.exit(1)
}
