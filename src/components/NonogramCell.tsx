import { memo } from 'react'
import type { Mark } from '../engine/nonogram/validator'

interface NonogramCellProps {
  row: number
  col: number
  mark: Mark
  borderRight: boolean
  borderBottom: boolean
  onClick: (row: number, col: number) => void
}

function NonogramCellImpl({ row, col, mark, borderRight, borderBottom, onClick }: NonogramCellProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      data-row={row}
      data-col={col}
      aria-label={mark === 'filled' ? 'Filled' : mark === 'x' ? 'Marked empty' : 'Empty'}
      className={`relative flex aspect-square items-center justify-center bg-surface select-none ${
        borderRight ? 'border-r-2 border-r-grid-line-strong' : 'border-r border-r-grid-gap'
      } ${borderBottom ? 'border-b-2 border-b-grid-line-strong' : 'border-b border-b-grid-gap'}`}
    >
      {mark === 'filled' && <span className="anim-pop-in absolute inset-[12%] rounded-[3px] bg-ink" />}
      {mark === 'x' && (
        <span className="relative flex size-[45%] items-center justify-center text-ink-muted">
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </span>
      )}
    </button>
  )
}

export const NonogramCell = memo(NonogramCellImpl)
