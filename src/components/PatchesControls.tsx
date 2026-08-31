import { ControlBar, ControlIconButton } from './ControlBar'
import { EraseIcon, UndoIcon } from './icons'

interface PatchesControlsProps {
  canUndo: boolean
  canClear: boolean
  onUndo: () => void
  onClear: () => void
  onOpenHints: () => void
  hintPrice: number
  /** Set by an active endless-boss "No Hints" modifier — see games/chapters.ts. */
  hintsDisabled?: boolean
  /** Clues without a correctly-placed rectangle yet — a simple count, not a strict
   *  correctness re-check, good enough for a contextual pill. */
  cluesLeft: number
}

export function PatchesControls({
  canUndo,
  canClear,
  onUndo,
  onClear,
  onOpenHints,
  hintPrice,
  hintsDisabled,
  cluesLeft,
}: PatchesControlsProps) {
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
        cluesLeft > 0 && (
          <span className="flex h-9 items-center rounded-full bg-accent-tint px-3.5 text-[13px] font-bold text-accent">
            {cluesLeft} clue{cluesLeft === 1 ? '' : 's'} left
          </span>
        )
      }
      onOpenHints={onOpenHints}
      hintPrice={hintPrice}
      hintsDisabled={hintsDisabled}
    />
  )
}
