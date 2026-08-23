interface SudokuControlsProps {
  canErase: boolean
  canUndo: boolean
  onErase: () => void
  onUndo: () => void
  onClear: () => void
  onOpenHints: () => void
  hintPrice: number
}

export function SudokuControls({
  canErase,
  canUndo,
  onErase,
  onUndo,
  onClear,
  onOpenHints,
  hintPrice,
}: SudokuControlsProps) {
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
      <button
        type="button"
        onClick={onOpenHints}
        className="flex items-center gap-1.5 rounded-full bg-accent-tint px-3 py-1.5 text-sm font-semibold text-accent"
      >
        Hint
        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">{hintPrice}</span>
      </button>
    </div>
  )
}
