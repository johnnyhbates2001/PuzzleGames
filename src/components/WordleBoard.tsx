import { useEffect, useRef, useState } from 'react'
import { WORD_LENGTH } from '../engine/wordle/types'
import type { LetterStatus } from '../engine/wordle/types'
import type { SubmittedGuess } from '../engine/wordle/validator'

interface WordleBoardProps {
  /** Total rows to render — the difficulty's attempt count (see WORDLE_RULES). */
  attempts: number
  guesses: SubmittedGuess[]
  /** Letters typed for the in-progress row, empty once nothing's left to play (e.g.
   *  the read-only preview on WordleCompletePage). */
  currentGuess: string
  /** True while the in-progress row should shake — an invalid or Hard-Mode-violating
   *  submission (see WordleGamePage). Self-clearing: the caller doesn't need to reset it. */
  shake?: boolean
  className?: string
}

const STATUS_CLASS: Record<LetterStatus, string> = {
  correct: 'border-transparent bg-wordle-correct text-white',
  present: 'border-transparent bg-wordle-present text-white',
  absent: 'border-transparent bg-wordle-absent text-white',
}

const REVEAL_STEP_MS = 130

export function WordleBoard({ attempts, guesses, currentGuess, shake, className }: WordleBoardProps) {
  // Only the most recently submitted row plays the reveal flip — tracked locally by
  // comparing guesses.length across renders, rather than the caller managing it, since
  // every consumer (the live board and the Complete screen's static preview alike)
  // wants exactly the same "only the newest row, once" behavior.
  const [revealingRow, setRevealingRow] = useState<number | null>(null)
  const prevCountRef = useRef(guesses.length)

  useEffect(() => {
    if (guesses.length > prevCountRef.current) {
      const row = guesses.length - 1
      setRevealingRow(row)
      const totalMs = (WORD_LENGTH - 1) * REVEAL_STEP_MS + 500
      const timer = setTimeout(() => setRevealingRow((r) => (r === row ? null : r)), totalMs)
      prevCountRef.current = guesses.length
      return () => clearTimeout(timer)
    }
    prevCountRef.current = guesses.length
  }, [guesses.length])

  const rows = Array.from({ length: attempts }, (_, row) => {
    if (row < guesses.length) return { kind: 'submitted' as const, guess: guesses[row] }
    if (row === guesses.length) return { kind: 'current' as const }
    return { kind: 'empty' as const }
  })

  return (
    <div className={`mx-auto flex w-full max-w-[340px] flex-col gap-1.5 ${className ?? ''}`}>
      {rows.map((row, r) => (
        <div key={r} className={`grid grid-cols-5 gap-1.5 ${row.kind === 'current' && shake ? 'anim-shake' : ''}`}>
          {Array.from({ length: WORD_LENGTH }, (_, c) => {
            if (row.kind === 'submitted') {
              const letter = row.guess.word[c]
              const status = row.guess.result[c]
              return (
                <div
                  key={c}
                  className={`flex aspect-square items-center justify-center rounded-[10px] border-2 text-[22px] font-extrabold uppercase ${STATUS_CLASS[status]} ${
                    r === revealingRow ? 'anim-wordle-reveal' : ''
                  }`}
                  style={r === revealingRow ? { animationDelay: `${c * REVEAL_STEP_MS}ms` } : undefined}
                >
                  {letter}
                </div>
              )
            }
            const letter = row.kind === 'current' ? currentGuess[c] : undefined
            return (
              <div
                key={c}
                className={`flex aspect-square items-center justify-center rounded-[10px] border-2 text-[22px] font-extrabold uppercase text-ink ${
                  letter ? 'border-ink-muted' : 'border-border-dashed'
                }`}
              >
                {letter ?? ''}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
