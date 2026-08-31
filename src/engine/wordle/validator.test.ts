import { describe, expect, it } from 'vitest'
import { evaluateGuess, hardModeViolation, isWinningResult, keyStatuses, type SubmittedGuess } from './validator'

describe('evaluateGuess', () => {
  it('marks every letter correct on an exact match', () => {
    expect(evaluateGuess('crane', 'crane')).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
  })

  it('marks letters absent when they never appear in the answer', () => {
    expect(evaluateGuess('bumpy', 'crane')).toEqual(['absent', 'absent', 'absent', 'absent', 'absent'])
  })

  it('marks a right letter in the wrong place as present', () => {
    // every letter of 'earcn' is in 'crane' but none share crane's own position.
    expect(evaluateGuess('earcn', 'crane')).toEqual(['present', 'present', 'present', 'present', 'present'])
  })

  it('never double-counts a repeated guess letter beyond the answer\'s own count', () => {
    // answer 'crane' has exactly one 'a'; guess 'aorta' has two, at index 0 and 4 —
    // only the first should claim it as 'present', the second must be 'absent'
    // rather than a second present.
    expect(evaluateGuess('aorta', 'crane')).toEqual(['present', 'absent', 'present', 'absent', 'absent'])
  })

  it('prefers correct over present for a repeated letter that also matches in place', () => {
    // answer 'eerie' has two 'e's; guess 'elder' has an 'e' correct at index 0 and
    // another 'e' at index 3 that should still find the remaining 'e' as present.
    expect(evaluateGuess('elder', 'eerie')).toEqual(['correct', 'absent', 'absent', 'present', 'present'])
  })
})

describe('isWinningResult', () => {
  it('is true only when every letter is correct', () => {
    expect(isWinningResult(['correct', 'correct', 'correct', 'correct', 'correct'])).toBe(true)
    expect(isWinningResult(['correct', 'present', 'correct', 'correct', 'correct'])).toBe(false)
  })
})

describe('hardModeViolation', () => {
  it('allows any guess with no history', () => {
    expect(hardModeViolation([], 'crane')).toBeNull()
  })

  it('requires a revealed correct letter to stay in position', () => {
    const history: SubmittedGuess[] = [{ word: 'crane', result: ['correct', 'absent', 'absent', 'absent', 'absent'] }]
    expect(hardModeViolation(history, 'chess')).toBeNull()
    expect(hardModeViolation(history, 'shirt')).toMatch(/1st letter must be C/)
  })

  it('requires a revealed present letter to be included somewhere', () => {
    const history: SubmittedGuess[] = [{ word: 'crane', result: ['absent', 'present', 'absent', 'absent', 'absent'] }]
    expect(hardModeViolation(history, 'rebus')).toBeNull()
    expect(hardModeViolation(history, 'oxide')).toMatch(/include R/)
  })
})

describe('keyStatuses', () => {
  it('keeps the best status seen for each letter', () => {
    const history: SubmittedGuess[] = [
      { word: 'crane', result: ['absent', 'absent', 'absent', 'absent', 'present'] },
      { word: 'eagle', result: ['correct', 'absent', 'absent', 'absent', 'absent'] },
    ]
    expect(keyStatuses(history)).toEqual({ c: 'absent', r: 'absent', a: 'absent', n: 'absent', e: 'correct', g: 'absent', l: 'absent' })
  })
})
