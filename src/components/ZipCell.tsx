import { memo } from 'react'

interface ZipCellProps {
  row: number
  col: number
  checkpointNumber: number | null
  inPath: boolean
  wallRight: boolean
  wallBottom: boolean
  /** True for one render after an illegal move was attempted on this cell — drives
   *  a shake, cleared by the caller once the animation finishes. */
  shake: boolean
  onShakeEnd: () => void
  /** True for one render right after the path reaches this checkpoint — drives the
   *  pulse, cleared by the caller once the animation finishes (see ZipGamePage.tsx). */
  justReached: boolean
  onCheckpointPulseEnd: () => void
  /** Ms to delay the solve-sweep's entrance by — set only once the path is complete,
   *  proportional to (row + col) so the wave travels diagonally (see ZipBoard.tsx). */
  sweepDelayMs?: number
  /** True for one render right after an Undo dropped this cell from the path — the
   *  real state is already off-path by then, so this overlays a fading ghost of the
   *  path tint instead of nothing. Cleared via onRetractEnd once it finishes. */
  retracting?: boolean
  onRetractEnd?: () => void
  /** True for one render right after a reveal-hint extended the path onto this cell —
   *  pulses the real (now-in-path) tint gold. Cleared via onHintPulseEnd. */
  hinted?: boolean
  onHintPulseEnd?: () => void
}

function ZipCellImpl({
  row,
  col,
  checkpointNumber,
  inPath,
  wallRight,
  wallBottom,
  shake,
  onShakeEnd,
  justReached,
  onCheckpointPulseEnd,
  sweepDelayMs,
  retracting,
  onRetractEnd,
  hinted,
  onHintPulseEnd,
}: ZipCellProps) {
  const showGhost = retracting && !inPath

  function handleAnimationEnd(e: React.AnimationEvent<HTMLButtonElement>) {
    if (e.animationName === 'shake') onShakeEnd()
    else if (e.animationName === 'hint-pulse') onHintPulseEnd?.()
  }

  return (
    <button
      type="button"
      data-row={row}
      data-col={col}
      aria-label={checkpointNumber !== null ? `Checkpoint ${checkpointNumber}` : `Row ${row + 1}, column ${col + 1}`}
      className={`relative flex aspect-square touch-none items-center justify-center select-none ${
        inPath ? 'bg-accent-tint' : 'bg-surface'
      } ${wallRight ? 'border-r-[3px] border-r-grid-line-strong' : 'border-r border-r-grid-gap'} ${
        wallBottom ? 'border-b-[3px] border-b-grid-line-strong' : 'border-b border-b-grid-gap'
      } ${shake ? 'anim-shake' : ''} ${sweepDelayMs !== undefined ? 'anim-solve-sweep' : ''} ${hinted ? 'anim-hint-pulse' : ''}`}
      style={{ animationDelay: sweepDelayMs !== undefined ? `${sweepDelayMs}ms` : undefined }}
      onAnimationEnd={shake || hinted ? handleAnimationEnd : undefined}
    >
      {showGhost && (
        <span className="anim-retract absolute inset-0 bg-accent-tint" onAnimationEnd={onRetractEnd} />
      )}
      {checkpointNumber !== null && (
        <span
          className={`relative z-20 flex size-[64%] items-center justify-center rounded-full text-[min(3.4vw,15px)] leading-none font-bold ${
            inPath
              ? 'bg-white text-ink shadow-[0_1px_3px_rgb(0_0_0/0.18)]'
              : 'border-2 border-dashed border-accent/45 bg-bg text-ink-muted'
          } ${justReached ? 'anim-checkpoint-hit' : ''}`}
          onAnimationEnd={justReached ? onCheckpointPulseEnd : undefined}
        >
          {checkpointNumber}
        </span>
      )}
    </button>
  )
}

export const ZipCell = memo(ZipCellImpl)
