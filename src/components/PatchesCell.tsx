import { memo } from 'react'
import type { PatchShape } from '../engine/patches/types'

interface PatchesCellProps {
  row: number
  col: number
  clueArea: number | null
  clueShape: PatchShape | null
  fillColor: string | null
  mismatched: boolean
  borderRight: boolean
  borderBottom: boolean
}

const SHAPE_BADGE_CLASS: Record<PatchShape, string> = {
  square: 'aspect-square',
  tall: 'aspect-[2/3]',
  wide: 'aspect-[3/2]',
}

function PatchesCellImpl({ row, col, clueArea, clueShape, fillColor, mismatched, borderRight, borderBottom }: PatchesCellProps) {
  return (
    <button
      type="button"
      data-row={row}
      data-col={col}
      aria-label={clueArea !== null ? `Clue ${clueArea}` : `Row ${row + 1}, column ${col + 1}`}
      className={`relative flex aspect-square touch-none items-center justify-center select-none ${fillColor ? '' : 'bg-surface'} ${
        borderRight ? 'border-r-2 border-r-grid-line-strong' : 'border-r border-r-grid-gap'
      } ${borderBottom ? 'border-b-2 border-b-grid-line-strong' : 'border-b border-b-grid-gap'}`}
      style={fillColor ? { backgroundColor: fillColor } : undefined}
    >
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
