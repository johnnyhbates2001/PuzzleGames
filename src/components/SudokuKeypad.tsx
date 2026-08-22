interface SudokuKeypadProps {
  selectedValue: number | null
  noteMode: boolean
  onDigit: (digit: number) => void
  onToggleNoteMode: () => void
}

export function SudokuKeypad({ selectedValue, noteMode, onDigit, onToggleNoteMode }: SudokuKeypadProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-3xl bg-surface p-2 shadow-card">
      <div className="grid w-full grid-cols-9 gap-1">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDigit(d)}
            className={`aspect-square rounded-xl text-lg font-bold ${
              selectedValue === d ? 'bg-accent-tint text-accent' : 'text-ink'
            }`}
          >
            {d}
          </button>
        ))}
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
