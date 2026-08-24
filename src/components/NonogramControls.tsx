import type { MarkMode } from '../state/nonogramReducer'

interface NonogramControlsProps {
  canUndo: boolean
  canClear: boolean
  markMode: MarkMode
  onUndo: () => void
  onClear: () => void
  onToggleMarkMode: () => void
  onOpenHints: () => void
  hintPrice: number
}

export function NonogramControls({
  canUndo,
  canClear,
  markMode,
  onUndo,
  onClear,
  onToggleMarkMode,
  onOpenHints,
  hintPrice,
}: NonogramControlsProps) {
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
      {/* Swaps what a tap/drag marks — fill or X — rather than relying on tapping
          through both marks on every cell (see nonogramReducer's CELL_CLICK). */}
      <button
        type="button"
        onClick={onToggleMarkMode}
        aria-pressed={markMode === 'x'}
        aria-label={markMode === 'x' ? 'Marking X — switch to fill' : 'Marking fill — switch to X'}
        className={`ml-auto flex size-9 shrink-0 items-center justify-center rounded-full text-base leading-none font-bold ${
          markMode === 'x' ? 'bg-accent-tint text-accent' : 'text-ink-muted'
        }`}
      >
        {markMode === 'x' ? '✕' : '▪'}
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
