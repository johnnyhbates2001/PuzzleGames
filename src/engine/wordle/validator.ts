import { WORD_LENGTH, type LetterStatus } from './types'

/** Standard two-pass Wordle scoring: exact matches first (so a repeated letter never
 *  gets "stolen" by an earlier partial match), then present/absent from what's left. */
export function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = new Array(WORD_LENGTH).fill('absent')
  const remaining: Record<string, number> = {}

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct'
    } else {
      remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue
    const letter = guess[i]
    if ((remaining[letter] ?? 0) > 0) {
      result[i] = 'present'
      remaining[letter]--
    }
  }

  return result
}

export function isWinningResult(result: LetterStatus[]): boolean {
  return result.every((s) => s === 'correct')
}

export interface SubmittedGuess {
  word: string
  result: LetterStatus[]
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th']

/** Hard Mode check (see DifficultyRules.hardMode): every letter revealed 'correct' by
 *  any earlier guess must reappear in the same position, and every letter revealed
 *  'present' must reappear somewhere. Returns a player-facing message describing the
 *  first violation found, or null if `candidate` is legal. */
export function hardModeViolation(history: SubmittedGuess[], candidate: string): string | null {
  const requiredPosition: (string | null)[] = new Array(WORD_LENGTH).fill(null)
  const requiredIncluded = new Set<string>()

  for (const { word, result } of history) {
    result.forEach((status, i) => {
      if (status === 'correct') requiredPosition[i] = word[i]
      else if (status === 'present') requiredIncluded.add(word[i])
    })
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    const required = requiredPosition[i]
    if (required && candidate[i] !== required) {
      return `${ORDINALS[i]} letter must be ${required.toUpperCase()}`
    }
  }
  for (const letter of requiredIncluded) {
    if (!candidate.includes(letter)) {
      return `Guess must include ${letter.toUpperCase()}`
    }
  }
  return null
}

/** Best status seen for each letter across every submitted guess (correct beats
 *  present beats absent) — feeds the on-screen keyboard's per-key coloring. */
export function keyStatuses(history: SubmittedGuess[]): Record<string, LetterStatus> {
  const rank: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 }
  const statuses: Record<string, LetterStatus> = {}
  for (const { word, result } of history) {
    result.forEach((status, i) => {
      const letter = word[i]
      const current = statuses[letter]
      if (!current || rank[status] > rank[current]) statuses[letter] = status
    })
  }
  return statuses
}
