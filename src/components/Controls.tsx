import { ControlBar, ControlIconButton } from './ControlBar'
import { EraseIcon, UndoIcon, XMarkIcon } from './icons'

interface ControlsProps {
  autoPlaceX: boolean
  canUndo: boolean
  onClear: () => void
  onUndo: () => void
  onToggleAutoX: (enabled: boolean) => void
  onOpenHints: () => void
  hintPrice: number
  /** Set by an active endless-boss "No Hints" modifier — see games/chapters.ts. */
  hintsDisabled?: boolean
}

export function Controls({
  autoPlaceX,
  canUndo,
  onClear,
  onUndo,
  onToggleAutoX,
  onOpenHints,
  hintPrice,
  hintsDisabled,
}: ControlsProps) {
  return (
    <ControlBar
      left={
        <>
          <ControlIconButton onClick={onUndo} disabled={!canUndo} label="Undo">
            <UndoIcon />
          </ControlIconButton>
          <ControlIconButton onClick={onClear} label="Clear">
            <EraseIcon />
          </ControlIconButton>
          <ControlIconButton onClick={() => onToggleAutoX(!autoPlaceX)} active={autoPlaceX} label="Auto X">
            <XMarkIcon size={17} />
          </ControlIconButton>
        </>
      }
      onOpenHints={onOpenHints}
      hintPrice={hintPrice}
      hintsDisabled={hintsDisabled}
    />
  )
}
