interface NonogramControlsProps {
  canUndo: boolean
  canClear: boolean
  onUndo: () => void
  onClear: () => void
  onOpenHints: () => void
  hintPrice: number
}

export function NonogramControls({ canUndo, canClear, onUndo, onClear, onOpenHints, hintPrice }: NonogramControlsProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-surface p-2 shadow-card">
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="rounded-full px-4 py-1.5 text-sm font-semibold text-ink-muted disabled:opacity-40"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={!canClear}
        className="rounded-full px-4 py-1.5 text-sm font-semibold text-ink-muted disabled:opacity-40"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={onOpenHints}
        className="flex items-center gap-1.5 rounded-full bg-accent-tint px-4 py-1.5 text-sm font-semibold text-accent"
      >
        Hint
        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">{hintPrice}</span>
      </button>
    </div>
  )
}
