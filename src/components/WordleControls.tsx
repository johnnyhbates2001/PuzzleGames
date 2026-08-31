import { ControlBar } from './ControlBar'

interface WordleControlsProps {
  attemptsLeft: number
  onOpenHints: () => void
  hintPrice: number
  /** Set by an active endless-boss "No Hints" modifier — see games/chapters.ts. */
  hintsDisabled?: boolean
}

export function WordleControls({ attemptsLeft, onOpenHints, hintPrice, hintsDisabled }: WordleControlsProps) {
  return (
    <ControlBar
      left={
        <span className="px-2 text-[13px] font-semibold text-ink-muted">
          {attemptsLeft} guess{attemptsLeft === 1 ? '' : 'es'} left
        </span>
      }
      onOpenHints={onOpenHints}
      hintPrice={hintPrice}
      hintsDisabled={hintsDisabled}
    />
  )
}
