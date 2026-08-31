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
 *  - writes src/data/banks/wordle-{easy,medium,hard}.json — 200-word slices of a
 *    deterministic shuffle of the answer pool, one per difficulty tier, mirroring
 *    every other game's pre-verified level banks (see games/wordleLevels.ts)
 *
 * Run via `npm run gen:wordle-banks`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mulberry32, shuffle } from '../src/engine/rng.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCE_DIR = join(__dirname, 'wordle-source')
const DATA_DIR = join(__dirname, '..', 'src', 'data')
const BANKS_DIR = join(DATA_DIR, 'banks')

const WORD_LENGTH = 5
const BANK_SIZE = 200
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

if (answers.length < BANK_SIZE * 3) {
  throw new Error(`Answer pool too small: ${answers.length} words, need at least ${BANK_SIZE * 3}`)
}

mkdirSync(BANKS_DIR, { recursive: true })

writeFileSync(join(DATA_DIR, 'wordleAnswers.json'), JSON.stringify(answers))
console.log(`[gen:wordle-banks] wrote wordleAnswers.json (${answers.length} words)`)

const validGuesses = Array.from(new Set([...guesses, ...answers])).sort()
writeFileSync(join(DATA_DIR, 'wordleGuesses.json'), JSON.stringify(validGuesses))
console.log(`[gen:wordle-banks] wrote wordleGuesses.json (${validGuesses.length} words)`)

// One deterministic shuffle of the full answer pool, sliced into three disjoint
// 200-word banks (easy/medium/hard) — leaves the remainder of the pool free for
// Endless/Free Play/Daily's random picks (see engine/wordle/generator.ts).
const shuffled = shuffle(answers, mulberry32(SEED))
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
DIFFICULTIES.forEach((difficulty, i) => {
  const slice = shuffled.slice(i * BANK_SIZE, (i + 1) * BANK_SIZE)
  const levels = slice.map((answer, index) => ({
    id: `wordle-${difficulty}-${index}`,
    difficulty,
    answer,
  }))
  const outPath = join(BANKS_DIR, `wordle-${difficulty}.json`)
  writeFileSync(outPath, JSON.stringify(levels))
  console.log(`[gen:wordle-banks] wrote ${outPath} (${levels.length} levels)`)
})
