interface ZipControlsProps {
  canUndo: boolean
  canClear: boolean
  onUndo: () => void
  onClear: () => void
}

export function ZipControls({ canUndo, canClear, onUndo, onClear }: ZipControlsProps) {
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
    </div>
  )
}
