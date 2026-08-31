import { ControlBar, ControlIconButton } from './ControlBar'
import { EraseIcon, UndoIcon } from './icons'

interface ZipControlsProps {
  canUndo: boolean
  canClear: boolean
  onUndo: () => void
  onClear: () => void
  onOpenHints: () => void
  hintPrice: number
  /** Set by an active endless-boss "No Hints" modifier — see games/chapters.ts. */
  hintsDisabled?: boolean
  /** 1-based number of the next unreached checkpoint, or null once every checkpoint
   *  has been reached — drives the ControlBar's center contextual pill. */
  nextCheckpoint: number | null
}

export function ZipControls({
  canUndo,
  canClear,
  onUndo,
  onClear,
  onOpenHints,
  hintPrice,
  hintsDisabled,
  nextCheckpoint,
}: ZipControlsProps) {
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
        nextCheckpoint !== null && (
          <span className="flex h-9 items-center rounded-full bg-accent-tint px-3.5 text-[13px] font-bold text-accent">
            Next · {nextCheckpoint}
          </span>
        )
      }
      onOpenHints={onOpenHints}
      hintPrice={hintPrice}
      hintsDisabled={hintsDisabled}
    />
  )
}
