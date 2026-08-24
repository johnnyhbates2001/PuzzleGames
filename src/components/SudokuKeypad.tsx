import { SUDOKU_SIZE } from '../engine/sudoku/types'

interface SudokuKeypadProps {
  selectedValue: number | null
  noteMode: boolean
  /** Count of each digit (1-9) currently on the board, indexed by digit — a digit
   *  with all SUDOKU_SIZE copies already placed is disabled and greyed out. */
  digitCounts: number[]
  onDigit: (digit: number) => void
  onToggleNoteMode: () => void
}

export function SudokuKeypad({ selectedValue, noteMode, digitCounts, onDigit, onToggleNoteMode }: SudokuKeypadProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-3xl bg-surface p-2 shadow-card">
      <div className="grid w-full grid-cols-9 gap-1">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => {
          const complete = digitCounts[d] >= SUDOKU_SIZE
          return (
            <button
              key={d}
              type="button"
              onClick={() => onDigit(d)}
              disabled={complete}
              aria-label={complete ? `${d}, all placed` : String(d)}
              className={`aspect-square rounded-xl text-lg font-bold ${
                complete ? 'text-ink-muted opacity-30' : selectedValue === d ? 'bg-accent-tint text-accent' : 'text-ink'
              }`}
            >
              {d}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onToggleNoteMode}
        aria-pressed={noteMode}
        className={`rounded-full px-4 py-1.5 text-xs font-semibold ${noteMode ? 'bg-accent-tint text-accent' : 'text-ink-muted'}`}
      >
        Notes {noteMode ? 'on' : 'off'}
      </button>
    </div>
  )
}
