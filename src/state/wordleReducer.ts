import { WORD_LENGTH, type WordleLevelRecord } from '../engine/wordle/types'
import { evaluateGuess, isWinningResult, type SubmittedGuess } from '../engine/wordle/validator'

export interface WordleGameState {
  level: WordleLevelRecord
  attempts: number
  hardMode: boolean
  guesses: SubmittedGuess[]
  /** Letters typed for the in-progress row, not yet submitted. */
  currentGuess: string
  status: 'playing' | 'won' | 'lost'
  elapsedMs: number
  runStartedAt: number | null
  /** Letter positions already revealed via the "Reveal a letter" hint — see
   *  revealableHintIndices, which reads this to avoid ever revealing the same
   *  position twice. */
  hintedIndices: Set<number>
  /** A nonzero count marks the eventual completion "assisted", which skips the
   *  personal-best update (see recordWordleCompletion in storage/db.ts). */
  hintsUsed: number
}

export interface PersistedWordleSnapshot {
  guesses: SubmittedGuess[]
  currentGuess: string
  elapsedMs: number
  hintedIndices: Set<number>
  hintsUsed: number
}

export type WordleAction =
  | { type: 'TYPE_LETTER'; letter: string }
  | { type: 'BACKSPACE' }
  | { type: 'SUBMIT_GUESS'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'LOAD'; level: WordleLevelRecord; attempts: number; hardMode: boolean; snapshot?: PersistedWordleSnapshot }
  | { type: 'HINT_REVEAL_LETTER'; index: number; now: number }

export function createInitialState(level: WordleLevelRecord, attempts: number, hardMode: boolean): WordleGameState {
  return {
    level,
    attempts,
    hardMode,
    guesses: [],
    currentGuess: '',
    status: 'playing',
    elapsedMs: 0,
    runStartedAt: null,
    hintedIndices: new Set(),
    hintsUsed: 0,
  }
}

/** Letter positions the "Reveal a letter" hint may still target — every position not
 *  already hint-revealed and not already known 'correct' from an earlier guess (a
 *  cumulative fact even if no single guess has been fully correct — see Hard Mode's
 *  own tracking in engine/wordle/validator.ts). Called by WordleGamePage before it
 *  dispatches HINT_REVEAL_LETTER, so the random pick itself stays outside the
 *  (otherwise deterministic) reducer. */
export function revealableHintIndices(state: WordleGameState): number[] {
  const known = new Set(state.hintedIndices)
  for (const { result } of state.guesses) {
    result.forEach((status, i) => {
      if (status === 'correct') known.add(i)
    })
  }
  const indices: number[] = []
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (!known.has(i)) indices.push(i)
  }
  return indices
}

function withStatusCheck(state: WordleGameState, now: number): WordleGameState {
  const last = state.guesses[state.guesses.length - 1]
  if (!last) return state
  const elapsedMs = state.runStartedAt !== null ? state.elapsedMs + (now - state.runStartedAt) : state.elapsedMs
  if (isWinningResult(last.result)) {
    return { ...state, status: 'won', elapsedMs, runStartedAt: null }
  }
  if (state.guesses.length >= state.attempts) {
    return { ...state, status: 'lost', elapsedMs, runStartedAt: null }
  }
  return state
}

export function wordleReducer(state: WordleGameState, action: WordleAction): WordleGameState {
  switch (action.type) {
    case 'TYPE_LETTER': {
      if (state.status !== 'playing' || state.currentGuess.length >= WORD_LENGTH) return state
      if (!/^[a-z]$/.test(action.letter)) return state
      return { ...state, currentGuess: state.currentGuess + action.letter }
    }

    case 'BACKSPACE': {
      if (state.status !== 'playing' || state.currentGuess.length === 0) return state
      return { ...state, currentGuess: state.currentGuess.slice(0, -1) }
    }

    case 'SUBMIT_GUESS': {
      if (state.status !== 'playing' || state.currentGuess.length !== WORD_LENGTH) return state
      const result = evaluateGuess(state.currentGuess, state.level.answer)
      const guesses = [...state.guesses, { word: state.currentGuess, result }]
      return withStatusCheck({ ...state, guesses, currentGuess: '' }, action.now)
    }

    case 'PAUSE': {
      if (state.runStartedAt === null) return state
      return { ...state, elapsedMs: state.elapsedMs + (action.now - state.runStartedAt), runStartedAt: null }
    }

    case 'RESUME': {
      if (state.status !== 'playing' || state.runStartedAt !== null) return state
      return { ...state, runStartedAt: action.now }
    }

    case 'HINT_REVEAL_LETTER': {
      if (state.status !== 'playing' || state.hintedIndices.has(action.index)) return state
      const hintedIndices = new Set(state.hintedIndices)
      hintedIndices.add(action.index)
      return { ...state, hintedIndices, hintsUsed: state.hintsUsed + 1 }
    }

    case 'LOAD': {
      const base = createInitialState(action.level, action.attempts, action.hardMode)
      if (!action.snapshot) return base
      return {
        ...base,
        guesses: action.snapshot.guesses,
        currentGuess: action.snapshot.currentGuess,
        elapsedMs: action.snapshot.elapsedMs,
        hintedIndices: new Set(action.snapshot.hintedIndices),
        hintsUsed: action.snapshot.hintsUsed,
      }
    }

    default:
      return state
  }
}
