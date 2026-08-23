interface ControlsProps {
  autoPlaceX: boolean
  canUndo: boolean
  onClear: () => void
  onUndo: () => void
  onToggleAutoX: (enabled: boolean) => void
  onOpenHints: () => void
  hintPrice: number
}

export function Controls({ autoPlaceX, canUndo, onClear, onUndo, onToggleAutoX, onOpenHints, hintPrice }: ControlsProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-surface p-2 shadow-card">
      <button
        type="button"
        role="switch"
        aria-checked={autoPlaceX}
        onClick={() => onToggleAutoX(!autoPlaceX)}
        className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
          autoPlaceX ? 'bg-accent-tint text-accent' : 'text-ink-muted'
        }`}
      >
        Auto X
      </button>

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-muted disabled:opacity-40"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onClear}
        className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-muted"
      >
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
