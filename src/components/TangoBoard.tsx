import { memo } from 'react'
import { EMPTY, type EdgeClue, type TangoGrid, type TangoValue } from '../engine/tango/types'
import { TangoSymbol } from './TangoSymbol'
import { HINT_FOCUS_RING } from './hintFocus'

const SWEEP_STEP_MS = 42

interface TangoBoardProps {
  grid: TangoGrid
  givens: TangoGrid
  edges: EdgeClue[]
  conflicts: Set<string>
  /** True once the puzzle is solved — triggers the one-shot diagonal solve-sweep
   *  before the win effect navigates away (see useGameCompletion). */
  solved?: boolean
  onCellClick: (row: number, col: number) => void
  /** Cells (coordKey) a reveal-hint just filled — pulses once, gold. */
  hintedCells?: Set<string>
  onHintPulseEnd?: (key: string) => void
  /** Cells (coordKey) a "Show next step" hint's reasoning refers to — outlined gold
   *  while its explanation is showing (see HintExplanation). */
  focusCells?: Set<string>
  className?: string
}

// Smaller signs on the 8x8 hard board, where the cells are too narrow for the 6x6 size
// to clear the symbols on either side.
const SIGN_SIZE_CLASS: Record<string, string> = {
  regular: 'size-[min(5vw,20px)] text-[min(3.6vw,15px)]',
  compact: 'size-[min(4vw,16px)] text-[min(3vw,12px)]',
}

export function TangoBoard({ grid, givens, edges, conflicts, solved, onCellClick, hintedCells, onHintPulseEnd, focusCells, className }: TangoBoardProps) {
  const n = grid.length
  const signSize = SIGN_SIZE_CLASS[n > 6 ? 'compact' : 'regular']
  return (
    // The complete screens position their blurred preview with `absolute` via className,
    // which must win over the `relative` the overlay layer otherwise needs.
    <div
      className={`${className?.includes('absolute') ? '' : 'relative'} mx-auto w-full overflow-hidden rounded-[20px] border-2 border-grid-line-strong ${className ?? ''}`}
    >
      <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {grid.map((row, r) =>
          row.map((value, c) => {
            const key = `${r},${c}`
            return (
              <TangoCell
                key={key}
                row={r}
                col={c}
                size={n}
                value={value}
                given={givens[r][c] !== EMPTY}
                conflict={conflicts.has(key)}
                sweepDelayMs={solved ? (r + c) * SWEEP_STEP_MS : undefined}
                hinted={!!hintedCells?.has(key)}
                focused={!!focusCells?.has(key)}
                onHintPulseEnd={() => onHintPulseEnd?.(key)}
                onClick={onCellClick}
              />
            )
          }),
        )}
      </div>
      {/* Signs sit centered on the shared border of their two cells — positioned as a
          fraction of the board so they line up at any width. */}
      {edges.map((edge) => {
        const left = edge.dir === 'right' ? (edge.col + 1) / n : (edge.col + 0.5) / n
        const top = edge.dir === 'right' ? (edge.row + 0.5) / n : (edge.row + 1) / n
        return (
          <span
            key={`${edge.row},${edge.col},${edge.dir}`}
            aria-label={edge.kind === 'same' ? 'equal' : 'opposite'}
            className={`pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface leading-none font-extrabold ${signSize} text-ink-muted shadow-[0_0_0_1.5px_var(--color-grid-gap)]`}
            style={{ left: `${left * 100}%`, top: `${top * 100}%` }}
          >
            {edge.kind === 'same' ? '=' : '×'}
          </span>
        )
      })}
    </div>
  )
}

interface TangoCellProps {
  row: number
  col: number
  size: number
  value: TangoValue
  given: boolean
  conflict: boolean
  sweepDelayMs?: number
  hinted: boolean
  onHintPulseEnd: () => void
  focused: boolean
  onClick: (row: number, col: number) => void
}

const TangoCell = memo(function TangoCell({ row, col, size, value, given, conflict, sweepDelayMs, hinted, onHintPulseEnd, focused, onClick }: TangoCellProps) {
  const borders = [col === size - 1 ? '' : 'border-r border-r-grid-gap', row === size - 1 ? '' : 'border-b border-b-grid-gap'].join(' ')

  return (
    <button
      type="button"
      data-row={row}
      data-col={col}
      // Cycles on pointer-down, not click: a phone can delay or swallow the second click
      // of a fast double tap (read as a zoom / double-click), which left a quick
      // sun → moon double tap stuck on sun. onClick is kept only for keyboard activation
      // (detail === 0), so a tap never counts twice.
      onPointerDown={(e) => {
        if (e.button === 0) onClick(row, col)
      }}
      onClick={(e) => {
        if (e.detail === 0) onClick(row, col)
      }}
      aria-label={value === EMPTY ? 'Empty' : value === 1 ? 'Sun' : 'Moon'}
      className={`relative flex aspect-square touch-manipulation items-center justify-center select-none ${borders} ${given ? 'bg-bg' : 'bg-surface'} ${
        conflict ? 'anim-shake' : ''
      } ${conflict ? 'ring-[2.5px] ring-inset ring-danger' : focused ? HINT_FOCUS_RING : ''} ${sweepDelayMs !== undefined ? 'anim-solve-sweep' : ''} ${hinted ? 'anim-hint-pulse' : ''}`}
      style={{ animationDelay: sweepDelayMs !== undefined ? `${sweepDelayMs}ms` : undefined }}
      onAnimationEnd={hinted ? (e) => e.animationName === 'hint-pulse' && onHintPulseEnd() : undefined}
    >
      {value !== EMPTY && <TangoSymbol key={value} value={value} className={`${size > 6 ? 'size-[52%]' : 'size-[58%]'} ${given ? '' : 'anim-pop-in'}`} />}
    </button>
  )
})
