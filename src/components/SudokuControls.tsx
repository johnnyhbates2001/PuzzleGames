interface SudokuControlsProps {
  canErase: boolean
  canUndo: boolean
  onErase: () => void
  onUndo: () => void
  onClear: () => void
}

export function SudokuControls({ canErase, canUndo, onErase, onUndo, onClear }: SudokuControlsProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-surface p-2 shadow-card">
      <button
        type="button"
        onClick={onErase}
        disabled={!canErase}
        className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-muted disabled:opacity-40"
      >
        Erase
      </button>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-muted disabled:opacity-40"
      >
        Undo
      </button>
      <button type="button" onClick={onClear} className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-muted">
        Clear
      </button>
    </div>
  )
}
