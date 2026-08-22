interface ControlsProps {
  autoPlaceX: boolean
  canUndo: boolean
  onClear: () => void
  onUndo: () => void
  onToggleAutoX: (enabled: boolean) => void
}

export function Controls({ autoPlaceX, canUndo, onClear, onUndo, onToggleAutoX }: ControlsProps) {
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
    </div>
  )
}
