export type Difficulty = 'easy' | 'medium' | 'hard'

export const WORD_LENGTH = 5

export interface WordleLevelRecord {
  id: string
  difficulty: Difficulty
  /** The (verified real-word) solution, always lowercase. Never shown to the player. */
  answer: string
}

/** Per-letter guess feedback, same three-state model as the real game. */
export type LetterStatus = 'correct' | 'present' | 'absent'

export interface DifficultyRules {
  attempts: number
  /** Hard Mode (the real Wordle's own optional rule, always-on for this tier): any
   *  letter revealed 'correct' must stay in that position in every later guess, and
   *  any letter revealed 'present' must appear somewhere in every later guess. */
  hardMode: boolean
}

// Easy trades Hard Mode's constraint for an extra attempt; Medium is the classic
// 6-guess/no-constraint game; Hard keeps 6 guesses but turns the constraint on —
// the spike in difficulty is entirely about information pressure, not attempt count.
export const WORDLE_RULES: Record<Difficulty, DifficultyRules> = {
  easy: { attempts: 7, hardMode: false },
  medium: { attempts: 6, hardMode: false },
  hard: { attempts: 6, hardMode: true },
}
