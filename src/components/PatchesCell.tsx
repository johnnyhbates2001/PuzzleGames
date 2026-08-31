import { memo } from 'react'
import type { PatchShape } from '../engine/patches/types'
import { useLingeringFlag } from '../hooks/useLingeringFlag'

const CONFLICT_TINT_HOLD_MS = 900

interface PatchesCellProps {
  row: number
  col: number
  clueArea: number | null
  clueShape: PatchShape | null
  fillColor: string | null
  /** Ms to delay the fill-in animation by — set only for the most-recently-placed
   *  rect's cells, proportional to distance from the drag anchor (see PatchesBoard.tsx). */
  fillDelayMs?: number
  /** Set only while this cell falls inside an in-progress drag's live preview
   *  rectangle — the clue's own color while the placement is valid, or a danger tint
   *  once it would overlap something. Renders as a translucent overlay so an
   *  already-filled cell underneath (an invalid overlap) still shows through. */
  previewColor?: string | null
  mismatched: boolean
  borderRight: boolean
  borderBottom: boolean
  /** Ms to delay the solve-sweep's entrance by — set only once the board is solved,
   *  proportional to (row + col) so the wave travels diagonally (see PatchesBoard.tsx). */
  sweepDelayMs?: number
  /** The fill color an Undo just removed from this cell, if any — the real state is
   *  already uncovered by then, so this fades a ghost of it instead of nothing.
   *  Cleared via onRetractEnd once the animation finishes. */
  retractGhostColor?: string | null
  onRetractEnd?: () => void
  /** True for one render right after a reveal-hint filled this cell — pulses the real
   *  (now-placed) fill gold. Cleared via onHintPulseEnd. */
  hinted?: boolean
  onHintPulseEnd?: () => void
}

const SHAPE_BADGE_CLASS: Record<PatchShape, string> = {
  square: 'aspect-square',
  tall: 'aspect-[2/3]',
  wide: 'aspect-[3/2]',
}

function PatchesCellImpl({
  row,
  col,
  clueArea,
  clueShape,
  fillColor,
  fillDelayMs,
  previewColor,
  mismatched,
  borderRight,
  borderBottom,
  sweepDelayMs,
  retractGhostColor,
  onRetractEnd,
  hinted,
  onHintPulseEnd,
}: PatchesCellProps) {
  const tinted = useLingeringFlag(mismatched, CONFLICT_TINT_HOLD_MS)

  function handleAnimationEnd(e: React.AnimationEvent<HTMLButtonElement>) {
    if (e.animationName === 'hint-pulse') onHintPulseEnd?.()
  }

  return (
    <button
      type="button"
      data-row={row}
      data-col={col}
      aria-label={clueArea !== null ? `Clue ${clueArea}` : `Row ${row + 1}, column ${col + 1}`}
      // Shake lives on the button itself (transform: translateX) so the whole cell
      // shakes; the fill's entrance animation (transform: scale + opacity) lives on
      // its own child span below — two `animation` shorthands on the same element
      // would fight in the cascade instead of playing together. The solve-sweep
      // (also a transform on the button) only ever runs once the board is fully
      // solved, well after any mismatch shake, so the two never overlap in practice.
      className={`relative flex aspect-square touch-none items-center justify-center bg-surface select-none ${
        mismatched ? 'anim-shake' : ''
      } ${borderRight ? 'border-r-2 border-r-grid-line-strong' : 'border-r border-r-grid-gap'} ${
        borderBottom ? 'border-b-2 border-b-grid-line-strong' : 'border-b border-b-grid-gap'
      } ${sweepDelayMs !== undefined ? 'anim-solve-sweep' : ''} ${hinted ? 'anim-hint-pulse' : ''}`}
      style={{ animationDelay: sweepDelayMs !== undefined ? `${sweepDelayMs}ms` : undefined }}
      onAnimationEnd={hinted ? handleAnimationEnd : undefined}
    >
      {retractGhostColor && (
        <span
          className="anim-retract pointer-events-none absolute inset-0"
          style={{ backgroundColor: retractGhostColor }}
          onAnimationEnd={onRetractEnd}
        />
      )}
      {fillColor && (
        <span
          className="anim-patch-fill pointer-events-none absolute inset-0"
          style={{ backgroundColor: fillColor, animationDelay: fillDelayMs ? `${fillDelayMs}ms` : undefined }}
        />
      )}
      {previewColor && (
        <span className="pointer-events-none absolute inset-0 opacity-55" style={{ backgroundColor: previewColor }} />
      )}
      {tinted && <span className="pointer-events-none absolute inset-0 rounded-[2px] ring-[2.5px] ring-inset ring-danger" />}
      {clueArea !== null && clueShape !== null && (
        <span
          className={`relative z-10 flex h-[62%] max-w-[80%] items-center justify-center rounded-md px-1.5 text-[min(3.4vw,15px)] leading-none font-bold ${SHAPE_BADGE_CLASS[clueShape]} ${
            fillColor && !tinted
              ? 'bg-white/90 text-[oklch(30%_0.03_60)] shadow-[0_1px_3px_rgb(0_0_0/0.1)]'
              : 'bg-surface text-accent shadow-[inset_0_0_0_2px_var(--color-accent)]'
          }`}
        >
          {clueArea}
        </span>
      )}
    </button>
  )
}

export const PatchesCell = memo(PatchesCellImpl)
