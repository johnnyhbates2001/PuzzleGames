import { memo } from 'react'
import type { CellState } from '../state/types'
import { hasX } from '../state/types'

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
  onClick: (row: number, col: number) => void
}

function CellImpl({ row, col, cell, regionColor, conflict, onClick }: CellProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      data-row={row}
      data-col={col}
      aria-label={cell.queen ? 'Queen' : hasX(cell) ? 'Marked' : 'Empty'}
      className={`relative flex aspect-square items-center justify-center text-[min(6vw,28px)] font-semibold leading-none select-none transition-shadow ${
        conflict ? 'anim-shake ring-[2.5px] ring-inset ring-danger' : ''
      }`}
      style={{ backgroundColor: regionColor }}
    >
      {cell.queen ? (
        <span className={`anim-pop-in ${conflict ? 'text-danger' : 'text-slate-900'}`}>♛</span>
      ) : hasX(cell) ? (
        <span className="text-slate-900/40">✕</span>
      ) : null}
    </button>
  )
}

export const Cell = memo(CellImpl)
