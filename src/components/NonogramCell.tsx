import { memo, type CSSProperties } from 'react'
import type { Mark } from '../engine/nonogram/validator'
import { useEquippedCosmetic } from '../hooks/useCosmetics'

interface NonogramCellProps {
  row: number
  col: number
  mark: Mark
  /** True while a drag-fill stroke is in progress anywhere on the board — suppresses
   *  the fill's pop-in so dragging across many cells doesn't stutter (see
   *  NonogramBoard.tsx); a plain tap still pops normally. */
  dragging: boolean
  borderRight: boolean
  borderBottom: boolean
  /** Ms to delay the solve-sweep's entrance by — set only once the grid is solved,
   *  proportional to (row + col) so the wave travels diagonally (see NonogramBoard.tsx). */
  sweepDelayMs?: number
  /** The mark an Undo just cleared from this cell, if any — the real state is already
   *  'empty' by the time we know, so this fades a ghost of it instead of nothing.
   *  Cleared via onRetractEnd once the animation finishes. */
  retractGhostMark?: Mark | null
  onRetractEnd?: () => void
  /** True for one render right after a reveal-hint marked this cell — pulses the real
   *  (now-marked) content gold. Cleared via onHintPulseEnd. */
  hinted?: boolean
  onHintPulseEnd?: () => void
  onClick: (row: number, col: number) => void
}

/** Nonogram 'fill textures' cosmetic (see cosmetics.ts) — a background-image swap on
 *  the filled-cell square, layered over its existing bg-accent (the fallback flat
 *  color 'classic' renders as, and what shows through where a texture leaves gaps). */
function fillTextureCss(texture: string): CSSProperties {
  switch (texture) {
    case 'crosshatch':
      return {
        backgroundImage:
          'repeating-linear-gradient(45deg, rgb(0 0 0 / 0.18) 0 2px, transparent 2px 8px), repeating-linear-gradient(-45deg, rgb(0 0 0 / 0.18) 0 2px, transparent 2px 8px)',
      }
    case 'dot-grid':
      return {
        backgroundImage: 'radial-gradient(rgb(0 0 0 / 0.22) 20%, transparent 21%)',
        backgroundSize: '8px 8px',
      }
    case 'gradient':
      // Nonogram's own accent (pink) shading into the app's default violet accent —
      // hardcoded since --color-accent is already overridden to pink at this point in
      // the tree ([data-game='nonogram']), so the default violet isn't reachable via a
      // token here.
      return { backgroundImage: 'linear-gradient(135deg, var(--color-accent), oklch(66% 0.17 300))' }
    case 'glow':
      return { boxShadow: '0 0 10px 2px var(--color-accent)' }
    default:
      return {}
  }
}

function NonogramCellImpl({
  row,
  col,
  mark,
  dragging,
  borderRight,
  borderBottom,
  sweepDelayMs,
  retractGhostMark,
  onRetractEnd,
  hinted,
  onHintPulseEnd,
  onClick,
}: NonogramCellProps) {
  const showGhost = !!retractGhostMark && mark === 'empty'
  const texture = useEquippedCosmetic('nonogramTexture')

  function handleAnimationEnd(e: React.AnimationEvent<HTMLButtonElement>) {
    if (e.animationName === 'hint-pulse') onHintPulseEnd?.()
  }

  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      data-row={row}
      data-col={col}
      aria-label={mark === 'filled' ? 'Filled' : mark === 'x' ? 'Marked empty' : 'Empty'}
      className={`relative flex aspect-square items-center justify-center bg-surface select-none ${
        borderRight ? 'border-r-2 border-r-grid-line-strong' : 'border-r border-r-grid-gap'
      } ${borderBottom ? 'border-b-2 border-b-grid-line-strong' : 'border-b border-b-grid-gap'} ${
        sweepDelayMs !== undefined ? 'anim-solve-sweep' : ''
      } ${hinted ? 'anim-hint-pulse' : ''}`}
      style={{ animationDelay: sweepDelayMs !== undefined ? `${sweepDelayMs}ms` : undefined }}
      onAnimationEnd={hinted ? handleAnimationEnd : undefined}
    >
      {mark === 'filled' && (
        <span
          className={`absolute inset-[12%] rounded-[3px] bg-accent ${dragging ? '' : 'anim-pop-in'}`}
          style={fillTextureCss(texture)}
        />
      )}
      {mark === 'x' && (
        <span className="relative flex size-[45%] items-center justify-center text-ink-muted">
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </span>
      )}
      {showGhost && retractGhostMark === 'filled' && (
        <span className="anim-retract absolute inset-[12%] rounded-[3px] bg-accent" onAnimationEnd={onRetractEnd} />
      )}
      {showGhost && retractGhostMark === 'x' && (
        <span
          className="anim-retract relative flex size-[45%] items-center justify-center text-ink-muted"
          onAnimationEnd={onRetractEnd}
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </span>
      )}
    </button>
  )
}

export const NonogramCell = memo(NonogramCellImpl)
