import { SUDOKU_SIZE } from '../engine/sudoku/types'
import { EraseIcon } from './icons'

interface SudokuKeypadProps {
  selectedValue: number | null
  /** Count of each digit (1-9) currently on the board, indexed by digit — a digit
   *  with all SUDOKU_SIZE copies already placed is disabled and greyed out. */
  digitCounts: number[]
  canErase: boolean
  onDigit: (digit: number) => void
  onErase: () => void
}

export function SudokuKeypad({ selectedValue, digitCounts, canErase, onDigit, onErase }: SudokuKeypadProps) {
  return (
    <div className="grid w-full grid-cols-5 gap-1.5 rounded-3xl bg-surface p-2 shadow-card">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => {
        const complete = digitCounts[d] >= SUDOKU_SIZE
        return (
          <button
            key={d}
            type="button"
            onClick={() => onDigit(d)}
            disabled={complete}
            aria-label={complete ? `${d}, all placed` : String(d)}
            className={`flex h-[52px] items-center justify-center rounded-xl text-lg font-bold ${
              complete ? 'text-ink-muted opacity-30' : selectedValue === d ? 'bg-accent text-white' : 'text-ink'
            }`}
          >
            {d}
          </button>
        )
      })}
      <button
        type="button"
        onClick={onErase}
        disabled={!canErase}
        aria-label="Erase"
        className="flex h-[52px] items-center justify-center rounded-xl text-ink-muted disabled:opacity-30"
      >
        <EraseIcon size={20} />
      </button>
    </div>
  )
}
