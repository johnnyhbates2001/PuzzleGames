import { memo } from 'react'

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

function SudokuCellImpl({ row, col, value, given, notes, selected, peer, sameValue, conflict, onClick }: SudokuCellProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(row, col)}
      data-row={row}
      data-col={col}
      aria-label={value === 0 ? 'Empty' : String(value)}
      className={`relative flex aspect-square items-center justify-center text-[min(4.5vw,20px)] leading-none select-none ${borderClasses(row, col)} ${backgroundClass(selected, sameValue, peer)} ${conflict ? 'anim-shake ring-[2.5px] ring-inset ring-danger' : ''}`}
    >
      {value !== 0 ? (
        <span
          className={`${given ? '' : 'anim-pop-in'} ${given ? 'font-bold text-ink' : conflict ? 'font-semibold text-danger' : 'font-semibold text-accent'}`}
        >
          {value}
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
