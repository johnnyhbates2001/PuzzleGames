interface PatchesControlsProps {
  canUndo: boolean
  canClear: boolean
  onUndo: () => void
  onClear: () => void
  onOpenHints: () => void
  hintPrice: number
  /** Set by an active endless-boss "No Hints" modifier — see games/chapters.ts. */
  hintsDisabled?: boolean
}

export function PatchesControls({
  canUndo,
  canClear,
  onUndo,
  onClear,
  onOpenHints,
  hintPrice,
  hintsDisabled,
}: PatchesControlsProps) {
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
        disabled={hintsDisabled}
        className="flex items-center gap-1.5 rounded-full bg-accent-tint px-4 py-1.5 text-sm font-semibold text-accent disabled:opacity-40"
      >
        Hint
        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
          {hintsDisabled ? '🔒' : hintPrice}
        </span>
      </button>
    </div>
  )
}
