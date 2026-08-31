import type { MarkMode } from '../state/nonogramReducer'
import { ControlBar, ControlIconButton } from './ControlBar'
import { EraseIcon, UndoIcon, XMarkIcon } from './icons'

interface NonogramControlsProps {
  canUndo: boolean
  canClear: boolean
  markMode: MarkMode
  onUndo: () => void
  onClear: () => void
  onToggleMarkMode: () => void
  onOpenHints: () => void
  hintPrice: number
  /** Set by an active endless-boss "No Hints" modifier — see games/chapters.ts. */
  hintsDisabled?: boolean
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
  hintsDisabled,
}: NonogramControlsProps) {
  return (
    <ControlBar
      left={
        <>
          <ControlIconButton onClick={onUndo} disabled={!canUndo} label="Undo">
            <UndoIcon />
          </ControlIconButton>
          <ControlIconButton onClick={onClear} disabled={!canClear} label="Clear">
            <EraseIcon />
          </ControlIconButton>
        </>
      }
      center={
        // Swaps what a tap/drag marks — fill or X — rather than relying on tapping
        // through both marks on every cell (see nonogramReducer's CELL_CLICK).
        <div className="flex h-9 items-center rounded-full bg-bg p-[3px]" role="group" aria-label="Mark mode">
          <button
            type="button"
            onClick={() => markMode !== 'fill' && onToggleMarkMode()}
            aria-pressed={markMode === 'fill'}
            aria-label="Fill"
            className={`flex h-full items-center justify-center rounded-full px-3.5 ${
              markMode === 'fill' ? 'bg-accent text-white' : 'text-ink-muted'
            }`}
          >
            <span className="size-2.5 rounded-[2px] bg-current" />
          </button>
          <button
            type="button"
            onClick={() => markMode !== 'x' && onToggleMarkMode()}
            aria-pressed={markMode === 'x'}
            aria-label="Mark X"
            className={`flex h-full items-center justify-center rounded-full px-3.5 ${
              markMode === 'x' ? 'bg-accent text-white' : 'text-ink-muted'
            }`}
          >
            <XMarkIcon size={13} />
          </button>
        </div>
      }
      onOpenHints={onOpenHints}
      hintPrice={hintPrice}
      hintsDisabled={hintsDisabled}
    />
  )
}
