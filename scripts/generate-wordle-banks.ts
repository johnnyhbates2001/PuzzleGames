/**
 * Build-time Wordle word-list generator.
 *
 * Unlike the other games, Wordle has no procedural puzzle to verify — the "puzzle" is
 * just a 5-letter answer word, so there's no solver step here. This script instead:
 *  - reads the curated answer list and the broader valid-guess list from
 *    scripts/wordle-source/{answers,guesses}.txt (one lowercase word per line)
 *  - writes src/data/wordleAnswers.json — the full answer pool, used by the runtime
 *    generator (src/engine/wordle/generator.ts) for Endless/Free Play/Daily
 *  - writes src/data/wordleGuesses.json — every word a player may type as a guess
 *    (the union of both source lists; every answer is also a valid guess)
 *  - writes src/data/banks/wordle-{easy,medium,hard}.json — disjoint word slices of a
 *    deterministic shuffle of the answer pool, one per difficulty tier, mirroring
 *    every other game's pre-verified level banks (see games/wordleLevels.ts)
 *
 * Run via `npm run gen:wordle-banks`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mulberry32, shuffle } from '../src/engine/rng.ts'
import type { Difficulty } from '../src/engine/types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_DIR = join(__dirname, 'wordle-source')
const DATA_DIR = join(__dirname, '..', 'src', 'data')
const BANKS_DIR = join(DATA_DIR, 'banks')

const WORD_LENGTH = 5
const BANK_SIZE: Record<Difficulty, number> = { easy: 200, medium: 300, hard: 500 }
const TOTAL_BANK_SIZE = BANK_SIZE.easy + BANK_SIZE.medium + BANK_SIZE.hard
const SEED = 900_001

function readWordList(name: string): string[] {
  const raw = readFileSync(join(SOURCE_DIR, name), 'utf8')
  return raw
    .split('\n')
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length === WORD_LENGTH && /^[a-z]+$/.test(w))
}

const answers = readWordList('answers.txt')
const guesses = readWordList('guesses.txt')

if (answers.length < TOTAL_BANK_SIZE) {
  throw new Error(`Answer pool too small: ${answers.length} words, need at least ${TOTAL_BANK_SIZE}`)
}

mkdirSync(BANKS_DIR, { recursive: true })

writeFileSync(join(DATA_DIR, 'wordleAnswers.json'), JSON.stringify(answers))
console.log(`[gen:wordle-banks] wrote wordleAnswers.json (${answers.length} words)`)

const validGuesses = Array.from(new Set([...guesses, ...answers])).sort()
writeFileSync(join(DATA_DIR, 'wordleGuesses.json'), JSON.stringify(validGuesses))
console.log(`[gen:wordle-banks] wrote wordleGuesses.json (${validGuesses.length} words)`)

// One deterministic shuffle of the full answer pool, sliced into three disjoint
// banks (easy/medium/hard) — leaves the remainder of the pool free for Endless/Free
// Play/Daily's random picks (see engine/wordle/generator.ts).
//
// Each bank's original 200-word slice (positions [0,200), [200,400), [400,600) for
// easy/medium/hard) is kept as an exact prefix, with any growth beyond that appended
// from the untouched remainder of the shuffle (starting at position 600) — so a bank
// that hasn't grown (easy) is byte-identical, and a bank that has grown (medium/hard)
// still serves the exact same words at every index a player may already be sitting on.
const shuffled = shuffle(answers, mulberry32(SEED))
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const LEGACY_BANK_SIZE = 200
let reserveCursor = LEGACY_BANK_SIZE * DIFFICULTIES.length
DIFFICULTIES.forEach((difficulty, i) => {
  const legacySlice = shuffled.slice(i * LEGACY_BANK_SIZE, (i + 1) * LEGACY_BANK_SIZE)
  const extraCount = BANK_SIZE[difficulty] - LEGACY_BANK_SIZE
  const extraSlice = extraCount > 0 ? shuffled.slice(reserveCursor, reserveCursor + extraCount) : []
  reserveCursor += extraSlice.length
  const slice = [...legacySlice, ...extraSlice]
  const levels = slice.map((answer, index) => ({
    id: `wordle-${difficulty}-${index}`,
    difficulty,
    answer,
  }))
  const outPath = join(BANKS_DIR, `wordle-${difficulty}.json`)
  writeFileSync(outPath, JSON.stringify(levels))
  console.log(`[gen:wordle-banks] wrote ${outPath} (${levels.length} levels)`)
})
