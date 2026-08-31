import { memo } from 'react'
import { useLingeringFlag } from '../hooks/useLingeringFlag'

const CONFLICT_TINT_HOLD_MS = 900

interface SudokuCellProps {
  row: number
  col: number
  value: number
  given: boolean
  notes: Set<number>
  selected: boolean
  peer: boolean
  sameValue: boolean
  conflict: boolean
  /** Ms to delay the cosmetic peer-ripple overlay by, set only when this cell is a
   *  peer of the just-placed digit (see SudokuBoard.tsx). */
  rippleDelayMs?: number
  /** Bumped on every placement — forced into the overlay's `key` so it remounts
   *  (and replays) even when a repeated placement computes the same delay. */
  rippleSeq?: number
  /** Ms to delay the solve-sweep's entrance by — set only once the puzzle is solved,
   *  proportional to (row + col) so the wave travels diagonally (see SudokuBoard.tsx). */
  sweepDelayMs?: number
  /** The digit an Undo just cleared from this cell, if any — the real value is already
   *  0 by the time we know, so this renders a fading ghost of it instead of nothing.
   *  Cleared via onRetractEnd once the animation finishes. */
  retractGhostValue?: number
  onRetractEnd?: () => void
  /** True for one render right after a reveal-hint filled this cell — pulses the real
   *  (now-placed) digit gold. Cleared via onHintPulseEnd. */
  hinted?: boolean
  onHintPulseEnd?: () => void
  /** Ms to delay this cell's completion bump by — set only when a direct digit
   *  placement just completed a row/col/box this cell belongs to (see SudokuGamePage).
   *  Cleared via onUnitCompleteEnd once the animation finishes. */
  unitCompleteDelayMs?: number
  onUnitCompleteEnd?: () => void
  onClick: (row: number, col: number) => void
}

function borderClasses(row: number, col: number): string {
  const classes: string[] = []
  classes.push(col === 8 ? '' : col % 3 === 2 ? 'border-r-2 border-r-grid-line-strong' : 'border-r border-r-grid-gap')
  classes.push(row === 8 ? '' : row % 3 === 2 ? 'border-b-2 border-b-grid-line-strong' : 'border-b border-b-grid-gap')
  return classes.join(' ')
}

function backgroundClass(selected: boolean, sameValue: boolean, peer: boolean): string {
  if (selected) return 'bg-accent-tint'
  if (sameValue) return 'bg-accent-tint/60'
  if (peer) return 'bg-bg'
  return 'bg-surface'
}

function SudokuCellImpl({
  row,
  col,
  value,
  given,
  notes,
  selected,
  peer,
  sameValue,
  conflict,
  rippleDelayMs,
  rippleSeq,
  sweepDelayMs,
  retractGhostValue,
  onRetractEnd,
  hinted,
  onHintPulseEnd,
  unitCompleteDelayMs,
  onUnitCompleteEnd,
  onClick,
}: SudokuCellProps) {
  const tinted = useLingeringFlag(conflict, CONFLICT_TINT_HOLD_MS)
  const showGhost = retractGhostValue !== undefined && value === 0
  const delayMs = sweepDelayMs ?? unitCompleteDelayMs

  function handleAnimationEnd(e: React.AnimationEvent<HTMLButtonElement>) {
    if (e.animationName === 'hint-pulse') onHintPulseEnd?.()
    else if (e.animationName === 'unit-complete') onUnitCompleteEnd?.()
  }

  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      data-row={row}
      data-col={col}
      aria-label={value === 0 ? 'Empty' : String(value)}
      className={`relative flex aspect-square items-center justify-center text-[min(4.5vw,20px)] leading-none select-none ${borderClasses(row, col)} ${backgroundClass(selected, sameValue, peer)} ${conflict ? 'anim-shake' : ''} ${tinted ? 'ring-[2.5px] ring-inset ring-danger' : ''} ${sweepDelayMs !== undefined ? 'anim-solve-sweep' : ''} ${hinted ? 'anim-hint-pulse' : ''} ${unitCompleteDelayMs !== undefined ? 'anim-unit-complete' : ''}`}
      style={{ animationDelay: delayMs !== undefined ? `${delayMs}ms` : undefined }}
      onAnimationEnd={hinted || unitCompleteDelayMs !== undefined ? handleAnimationEnd : undefined}
    >
      {rippleDelayMs !== undefined && (
        <span
          key={rippleSeq}
          className="anim-ripple pointer-events-none absolute inset-0 rounded-[3px] bg-accent/25"
          style={{ animationDelay: `${rippleDelayMs}ms` }}
        />
      )}
      {value !== 0 ? (
        <span
          className={`${given ? '' : 'anim-pop-in'} ${given ? 'font-bold text-ink' : tinted ? 'font-semibold text-danger' : 'font-semibold text-accent'}`}
        >
          {value}
        </span>
      ) : showGhost ? (
        <span className="anim-retract flex font-semibold text-slate-900" onAnimationEnd={onRetractEnd}>
          {retractGhostValue}
        </span>
      ) : notes.size > 0 ? (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 p-0.5">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => (
            <span key={d} className="flex items-center justify-center text-[min(1.6vw,8px)] leading-none text-ink-muted">
              {notes.has(d) ? d : ''}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  )
}

export const SudokuCell = memo(SudokuCellImpl)
