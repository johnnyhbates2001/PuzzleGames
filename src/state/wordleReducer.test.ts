import { describe, expect, it } from 'vitest'
import { createInitialState, revealableHintIndices, wordleReducer, type PersistedWordleSnapshot, type WordleGameState } from './wordleReducer'
import type { WordleLevelRecord } from '../engine/wordle/types'

const LEVEL: WordleLevelRecord = { id: 'test', difficulty: 'medium', answer: 'crane' }

function fresh(attempts = 6, hardMode = false): WordleGameState {
  return createInitialState(LEVEL, attempts, hardMode)
}

function typeWord(state: WordleGameState, word: string): WordleGameState {
  let next = state
  for (const letter of word) next = wordleReducer(next, { type: 'TYPE_LETTER', letter })
  return next
}

describe('TYPE_LETTER / BACKSPACE', () => {
  it('appends letters up to the word length, then stops accepting more', () => {
    let state = typeWord(fresh(), 'cranes')
    expect(state.currentGuess).toBe('crane')
  })

  it('rejects non a-z input', () => {
    const state = wordleReducer(fresh(), { type: 'TYPE_LETTER', letter: '5' })
    expect(state.currentGuess).toBe('')
  })

  it('removes the last letter', () => {
    let state = typeWord(fresh(), 'cra')
    state = wordleReducer(state, { type: 'BACKSPACE' })
    expect(state.currentGuess).toBe('cr')
  })

  it('does nothing on an empty row', () => {
    const state = wordleReducer(fresh(), { type: 'BACKSPACE' })
    expect(state.currentGuess).toBe('')
  })
})

describe('SUBMIT_GUESS', () => {
  it('refuses to submit a short guess', () => {
    const state = wordleReducer(typeWord(fresh(), 'cra'), { type: 'SUBMIT_GUESS', now: 0 })
    expect(state.guesses).toHaveLength(0)
  })

  it('scores the guess, appends it, and clears the current row', () => {
    let state = typeWord(fresh(), 'stare')
    state = wordleReducer(state, { type: 'SUBMIT_GUESS', now: 0 })
    expect(state.guesses).toHaveLength(1)
    expect(state.guesses[0].word).toBe('stare')
    expect(state.currentGuess).toBe('')
    expect(state.status).toBe('playing')
  })

  it('wins the moment the answer is guessed exactly', () => {
    let state = typeWord(fresh(), 'crane')
    state = wordleReducer(state, { type: 'SUBMIT_GUESS', now: 1000 })
    expect(state.status).toBe('won')
    expect(state.runStartedAt).toBeNull()
  })

  it('loses once the attempt limit is used up without solving', () => {
    let state = fresh(2)
    state = wordleReducer(typeWord(state, 'stare'), { type: 'SUBMIT_GUESS', now: 0 })
    expect(state.status).toBe('playing')
    state = wordleReducer(typeWord(state, 'blimp'), { type: 'SUBMIT_GUESS', now: 0 })
    expect(state.status).toBe('lost')
  })

  it('ignores further input once the run is over', () => {
    let state = fresh(1)
    state = wordleReducer(typeWord(state, 'stare'), { type: 'SUBMIT_GUESS', now: 0 })
    expect(state.status).toBe('lost')
    const after = typeWord(state, 'a')
    expect(after.currentGuess).toBe('')
  })
})

describe('HINT_REVEAL_LETTER / revealableHintIndices', () => {
  it('starts with every position revealable', () => {
    expect(revealableHintIndices(fresh())).toEqual([0, 1, 2, 3, 4])
  })

  it('removes a revealed index from future hints and counts it as used', () => {
    let state = wordleReducer(fresh(), { type: 'HINT_REVEAL_LETTER', index: 2, now: 0 })
    expect(state.hintsUsed).toBe(1)
    expect(revealableHintIndices(state)).toEqual([0, 1, 3, 4])
    // Revealing the same index again is a no-op, not a second hint charge.
    state = wordleReducer(state, { type: 'HINT_REVEAL_LETTER', index: 2, now: 0 })
    expect(state.hintsUsed).toBe(1)
  })

  it('also excludes positions a submitted guess already confirmed correct', () => {
    let state = typeWord(fresh(), 'crimp') // c-r correct, rest not
    state = wordleReducer(state, { type: 'SUBMIT_GUESS', now: 0 })
    expect(revealableHintIndices(state)).toEqual([2, 3, 4])
  })
})

describe('LOAD', () => {
  it('restores a persisted snapshot', () => {
    const snapshot: PersistedWordleSnapshot = {
      guesses: [{ word: 'stare', result: ['absent', 'present', 'absent', 'absent', 'correct'] }],
      currentGuess: 'cr',
      elapsedMs: 4200,
      hintedIndices: new Set([1]),
      hintsUsed: 1,
    }
    const state = wordleReducer(fresh(), { type: 'LOAD', level: LEVEL, attempts: 6, hardMode: false, snapshot })
    expect(state.guesses).toEqual(snapshot.guesses)
    expect(state.currentGuess).toBe('cr')
    expect(state.elapsedMs).toBe(4200)
    expect(state.hintsUsed).toBe(1)
    expect(state.hintedIndices.has(1)).toBe(true)
  })
})
