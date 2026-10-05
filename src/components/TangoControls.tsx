import { ControlBar, ControlIconButton } from './ControlBar'
import { EraseIcon, UndoIcon } from './icons'

interface TangoControlsProps {
  canUndo: boolean
  onUndo: () => void
  onClear: () => void
  onOpenHints: () => void
  hintPrice: number
  /** Set by an active endless-boss "No Hints" modifier — see games/chapters.ts. */
  hintsDisabled?: boolean
}

export function TangoControls({ canUndo, onUndo, onClear, onOpenHints, hintPrice, hintsDisabled }: TangoControlsProps) {
  return (
    <ControlBar
      left={
        <>
          <ControlIconButton onClick={onUndo} disabled={!canUndo} label="Undo">
            <UndoIcon />
          </ControlIconButton>
          {/* Hold, don't tap — same reasoning as Sudoku's Clear. */}
          <ControlIconButton onClick={onClear} holdMs={550} label="Hold to clear">
            <EraseIcon />
          </ControlIconButton>
        </>
      }
      onOpenHints={onOpenHints}
      hintPrice={hintPrice}
      hintsDisabled={hintsDisabled}
    />
  )
}
