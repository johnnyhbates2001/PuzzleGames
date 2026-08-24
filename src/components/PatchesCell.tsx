import { memo } from 'react'
import type { PatchShape } from '../engine/patches/types'

interface PatchesCellProps {
  row: number
  col: number
  clueArea: number | null
  clueShape: PatchShape | null
  fillColor: string | null
  /** Ms to delay the fill-in animation by — set only for the most-recently-placed
   *  rect's cells, proportional to distance from the drag anchor (see PatchesBoard.tsx). */
  fillDelayMs?: number
  mismatched: boolean
  borderRight: boolean
  borderBottom: boolean
  /** Ms to delay the solve-sweep's entrance by — set only once the board is solved,
   *  proportional to (row + col) so the wave travels diagonally (see PatchesBoard.tsx). */
  sweepDelayMs?: number
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
  mismatched,
  borderRight,
  borderBottom,
  sweepDelayMs,
}: PatchesCellProps) {
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
      } ${sweepDelayMs !== undefined ? 'anim-solve-sweep' : ''}`}
      style={{ animationDelay: sweepDelayMs !== undefined ? `${sweepDelayMs}ms` : undefined }}
    >
      {fillColor && (
        <span
          className="anim-patch-fill pointer-events-none absolute inset-0"
          style={{ backgroundColor: fillColor, animationDelay: fillDelayMs ? `${fillDelayMs}ms` : undefined }}
        />
      )}
      {mismatched && <span className="pointer-events-none absolute inset-0 rounded-[2px] ring-[2.5px] ring-inset ring-danger" />}
      {clueArea !== null && clueShape !== null && (
        <span
          className={`relative z-10 flex h-[62%] max-w-[80%] items-center justify-center rounded-md border-2 border-ink-muted px-1.5 text-[min(3.4vw,15px)] leading-none font-bold text-ink ${SHAPE_BADGE_CLASS[clueShape]}`}
        >
          {clueArea}
        </span>
      )}
    </button>
  )
}

export const PatchesCell = memo(PatchesCellImpl)
