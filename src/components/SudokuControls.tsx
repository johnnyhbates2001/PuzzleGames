import { ControlBar, ControlIconButton } from './ControlBar'
import { EraseIcon, PencilIcon, UndoIcon } from './icons'

interface SudokuControlsProps {
  canUndo: boolean
  noteMode: boolean
  onUndo: () => void
  onClear: () => void
  onToggleNoteMode: () => void
  onOpenHints: () => void
  hintPrice: number
  /** Set by an active endless-boss "No Hints" modifier — see games/chapters.ts. */
  hintsDisabled?: boolean
}

export function SudokuControls({
  canUndo,
  noteMode,
  onUndo,
  onClear,
  onToggleNoteMode,
  onOpenHints,
  hintPrice,
  hintsDisabled,
}: SudokuControlsProps) {
  return (
    <ControlBar
      left={
        <>
          <ControlIconButton onClick={onUndo} disabled={!canUndo} label="Undo">
            <UndoIcon />
          </ControlIconButton>
          {/* Hold, don't tap — clearing the whole board is destructive and shares a
              row with Undo, so a mis-tap here is easy to make. */}
          <ControlIconButton onClick={onClear} holdMs={550} label="Hold to clear">
            <EraseIcon />
          </ControlIconButton>
        </>
      }
      center={
        <button
          type="button"
          onClick={onToggleNoteMode}
          aria-pressed={noteMode}
          className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold ${
            noteMode ? 'bg-accent-tint text-accent' : 'text-ink-muted'
          }`}
        >
          <PencilIcon size={15} />
          Notes
        </button>
      }
      onOpenHints={onOpenHints}
      hintPrice={hintPrice}
      hintsDisabled={hintsDisabled}
    />
  )
}
