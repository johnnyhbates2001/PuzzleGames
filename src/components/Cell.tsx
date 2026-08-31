import { memo } from 'react'
import type { CellState } from '../state/types'
import { hasX } from '../state/types'
import { CrownIcon, XMarkIcon } from './icons'
import { useLingeringFlag } from '../hooks/useLingeringFlag'

const CONFLICT_TINT_HOLD_MS = 900

/** Palette indexed by region id — up to 10 distinct regions (the hard 10x10 max). */
export const REGION_COLORS = [
  '#FCA5A5', // red
  '#FDBA74', // orange
  '#FDE68A', // yellow
  '#86EFAC', // green
  '#5EEAD4', // teal
  '#7DD3FC', // sky
  '#A5B4FC', // indigo
  '#D8B4FE', // purple
  '#F9A8D4', // pink
  '#D4D4D8', // gray
]

interface CellProps {
  row: number
  col: number
  cell: CellState
  regionColor: string
  conflict: boolean
  /** Ms to delay the auto-X's entrance animation by — set only for auto-X'd cells,
   *  proportional to distance from the queen that ruled them out (see Board.tsx),
   *  so the X's visibly propagate outward instead of all appearing at once. */
  autoXDelayMs?: number
  /** Ms to delay the solve-sweep's entrance by — set only once the level is solved,
   *  proportional to (row + col) so the wave travels diagonally (see Board.tsx). */
  sweepDelayMs?: number
  /** True for one render right after an Undo removed this cell's queen — the real
   *  state is already empty by then, so this renders a fading ghost crown instead
   *  (see GamePage.tsx). Cleared via onRetractEnd once the animation finishes. */
  retracting?: boolean
  onRetractEnd?: () => void
  /** True for one render right after a reveal-hint filled this cell — pulses the
   *  real (now-placed) queen gold. Cleared via onHintPulseEnd. */
  hinted?: boolean
  onHintPulseEnd?: () => void
  onClick: (row: number, col: number) => void
}

function CellImpl({
  row,
  col,
  cell,
  regionColor,
  conflict,
  autoXDelayMs,
  sweepDelayMs,
  retracting,
  onRetractEnd,
  hinted,
  onHintPulseEnd,
  onClick,
}: CellProps) {
  const tinted = useLingeringFlag(conflict, CONFLICT_TINT_HOLD_MS)
  const showGhost = retracting && !cell.queen
  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      data-row={row}
      data-col={col}
      aria-label={cell.queen ? 'Queen' : hasX(cell) ? 'Marked' : 'Empty'}
      className={`relative flex aspect-square items-center justify-center text-[min(6vw,28px)] font-semibold leading-none select-none transition-shadow ${
        conflict ? 'anim-shake' : ''
      } ${tinted ? 'ring-[2.5px] ring-inset ring-danger' : ''} ${sweepDelayMs !== undefined ? 'anim-solve-sweep' : ''} ${
        hinted ? 'anim-hint-pulse' : ''
      }`}
      style={{ backgroundColor: regionColor, animationDelay: sweepDelayMs !== undefined ? `${sweepDelayMs}ms` : undefined }}
      onAnimationEnd={hinted ? onHintPulseEnd : undefined}
    >
      {cell.queen ? (
        <span className={`anim-pop-in flex text-[min(6vw,28px)] ${tinted ? 'text-danger' : 'text-slate-900'}`}>
          <CrownIcon className="size-[1em]" />
        </span>
      ) : showGhost ? (
        <span className="anim-retract flex text-[min(6vw,28px)] text-slate-900" onAnimationEnd={onRetractEnd}>
          <CrownIcon className="size-[1em]" />
        </span>
      ) : hasX(cell) ? (
        <span
          className="anim-x-in flex text-[min(6vw,28px)] text-slate-900/40"
          style={autoXDelayMs ? { animationDelay: `${autoXDelayMs}ms` } : undefined}
        >
          <XMarkIcon className="size-[1em]" />
        </span>
      ) : null}
    </button>
  )
}

export const Cell = memo(CellImpl)
