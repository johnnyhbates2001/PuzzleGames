import type { LetterStatus } from '../engine/wordle/types'
import { EraseIcon } from './icons'

interface WordleKeyboardProps {
  /** Best status seen so far for each letter (see engine/wordle/validator's
   *  keyStatuses) — colors each key the same way the tiles it came from are colored. */
  statuses: Record<string, LetterStatus>
  onLetter: (letter: string) => void
  onEnter: () => void
  onBackspace: () => void
  /** True once the run is over — every key goes inert. */
  disabled?: boolean
  /** Set by an active endless-boss "No Undo" modifier (see games/chapters.ts) —
   *  Wordle has no separate Undo action, so this is what it disables instead: once a
   *  letter is placed it's committed, nothing typed this row can be taken back. */
  backspaceDisabled?: boolean
}

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

const STATUS_CLASS: Record<LetterStatus, string> = {
  correct: 'bg-wordle-correct text-white',
  present: 'bg-wordle-present text-white',
  absent: 'bg-wordle-absent text-white opacity-60',
}

export function WordleKeyboard({ statuses, onLetter, onEnter, onBackspace, disabled, backspaceDisabled }: WordleKeyboardProps) {
  return (
    <div className="flex w-full flex-col gap-1.5 rounded-3xl bg-surface p-2 shadow-card">
      {ROWS.map((row, i) => (
        <div key={row} className="flex justify-center gap-1.5">
          {i === 2 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onEnter}
              aria-label="Submit guess"
              className="flex h-11 flex-[1.6] items-center justify-center rounded-lg bg-accent-tint text-[11px] font-bold text-accent disabled:opacity-40"
            >
              Enter
            </button>
          )}
          {row.split('').map((letter) => {
            const status = statuses[letter]
            return (
              <button
                key={letter}
                type="button"
                disabled={disabled}
                onClick={() => onLetter(letter)}
                aria-label={letter}
                className={`flex h-11 flex-1 items-center justify-center rounded-lg text-[13px] font-bold uppercase disabled:opacity-40 ${
                  status ? STATUS_CLASS[status] : 'bg-bg text-ink'
                }`}
              >
                {letter}
              </button>
            )
          })}
          {i === 2 && (
            <button
              type="button"
              disabled={disabled || backspaceDisabled}
              onClick={onBackspace}
              aria-label="Backspace"
              className="flex h-11 flex-[1.6] items-center justify-center rounded-lg bg-accent-tint text-accent disabled:opacity-40"
            >
              <EraseIcon size={17} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
