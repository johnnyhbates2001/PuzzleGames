import { useMemo } from 'react'
import type { SudokuCellState } from '../state/sudokuTypes'
import { boxIndex } from '../engine/sudoku/types'
import { cageIndexGrid, cageLabelCell, type Cage } from '../engine/killer/types'
import { SudokuCell } from './SudokuCell'

interface RippleOrigin {
  row: number
  col: number
  seq: number
}

interface SudokuBoardProps {
  board: SudokuCellState[][]
  /** Killer Sudoku only — draws each cage's dashed outline and sum label. */
  cages?: Cage[]
  selected: { row: number; col: number } | null
  conflicts: Set<string>
  /** The cell a digit was just placed in, plus a sequence number — purely cosmetic,
   *  drives a brief outward pulse across its row/col/box peers (see SudokuGamePage).
   *  Distinct from `selected`, which persists across renders and shouldn't re-pulse. */
  ripple: RippleOrigin | null
  /** True once the puzzle is solved — triggers the one-shot diagonal solve-sweep
   *  across every cell before the win effect navigates away (see useGameCompletion). */
  solved?: boolean
  onCellClick: (row: number, col: number) => void
  /** Cells (coordKey) an Undo just cleared, mapped to the digit that was removed — see
   *  SudokuGamePage.tsx's diff-on-undo wiring. Renders a fading ghost of that digit
   *  instead of nothing, since the real state has already gone empty by the time we know. */
  retractedCells?: Map<string, number>
  onRetractEnd?: (key: string) => void
  /** Cells (coordKey) a reveal-hint just filled — pulses once, gold. */
  hintedCells?: Set<string>
  onHintPulseEnd?: (key: string) => void
  /** Cells (coordKey) a "Show next step" hint's reasoning refers to — outlined gold
   *  while its explanation is showing (see HintExplanation). */
  focusCells?: Set<string>
  /** Cells (coordKey) belonging to a row/col/box that a direct digit placement just
   *  completed, mapped to their outward-stagger delay from the placed cell. */
  completedUnitCells?: Map<string, number>
  onUnitCompleteEnd?: (key: string) => void
  className?: string
}

function isPeer(row: number, col: number, origin: { row: number; col: number }): boolean {
  if (row === origin.row && col === origin.col) return false
  return row === origin.row || col === origin.col || boxIndex(row, col) === boxIndex(origin.row, origin.col)
}

// Cage outlines are drawn as one SVG layer over the whole board, in a 900x900 viewBox
// (100 units per cell), rather than as a dashed box inside each cell button: iOS Safari
// gave those per-cell boxes their width but no height, so every vertical cage edge
// collapsed to a dot. A board-level overlay sizes off the board itself, like Tango's
// signs. Lines sit CAGE_INSET inside the cage's edge and run to the cell edge where the
// cage continues, so neighbouring cells' segments join into one outline.
const CELL = 100
const CAGE_INSET = 7

/** Sum label per cell (undefined for all but each cage's label cell), computed once per
 *  level so SudokuCell's memo still holds while the player types. */
function buildCageLabels(cages: Cage[]): (number | undefined)[][] {
  const labels: (number | undefined)[][] = Array.from({ length: 9 }, () => new Array(9).fill(undefined))
  for (const cage of cages) {
    const { row, col } = cageLabelCell(cage)
    labels[row][col] = cage.sum
  }
  return labels
}

function buildCagePath(cages: Cage[]): string {
  const owner = cageIndexGrid(cages)
  const d = CAGE_INSET
  const parts: string[] = []
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const ci = owner[r][c]
      const same = (rr: number, cc: number) => rr >= 0 && rr < 9 && cc >= 0 && cc < 9 && owner[rr][cc] === ci
      const top = !same(r - 1, c)
      const bottom = !same(r + 1, c)
      const left = !same(r, c - 1)
      const right = !same(r, c + 1)
      const x0 = c * CELL
      const y0 = r * CELL
      const x1 = x0 + CELL
      const y1 = y0 + CELL
      if (top) parts.push(`M${left ? x0 + d : x0} ${y0 + d}H${right ? x1 - d : x1}`)
      if (bottom) parts.push(`M${left ? x0 + d : x0} ${y1 - d}H${right ? x1 - d : x1}`)
      if (left) parts.push(`M${x0 + d} ${top ? y0 + d : y0}V${bottom ? y1 - d : y1}`)
      if (right) parts.push(`M${x1 - d} ${top ? y0 + d : y0}V${bottom ? y1 - d : y1}`)
      // Inside corners of L-shaped cages: the two neighbouring cells' lines stop at this
      // cell's edge, so close the gap between them with a small notch.
      if (!top && !left && !same(r - 1, c - 1)) parts.push(`M${x0 + d} ${y0}V${y0 + d}H${x0}`)
      if (!top && !right && !same(r - 1, c + 1)) parts.push(`M${x1 - d} ${y0}V${y0 + d}H${x1}`)
      if (!bottom && !left && !same(r + 1, c - 1)) parts.push(`M${x0 + d} ${y1}V${y1 - d}H${x0}`)
      if (!bottom && !right && !same(r + 1, c + 1)) parts.push(`M${x1 - d} ${y1}V${y1 - d}H${x1}`)
    }
  }
  return parts.join('')
}

const RIPPLE_STEP_MS = 25
const SWEEP_STEP_MS = 42

export function SudokuBoard({
  board,
  cages,
  selected,
  conflicts,
  ripple,
  solved,
  onCellClick,
  retractedCells,
  onRetractEnd,
  hintedCells,
  focusCells,
  onHintPulseEnd,
  completedUnitCells,
  onUnitCompleteEnd,
  className,
}: SudokuBoardProps) {
  const selectedValue = selected ? board[selected.row][selected.col].value : 0
  const cageLabels = useMemo(() => (cages ? buildCageLabels(cages) : null), [cages])
  const cagePath = useMemo(() => (cages ? buildCagePath(cages) : null), [cages])

  return (
    // The complete screens position their blurred preview with `absolute` via className,
    // which must win over the `relative` the overlay layer otherwise needs.
    <div
      className={`${className?.includes('absolute') ? '' : 'relative'} mx-auto w-full overflow-hidden rounded-[20px] border-2 border-grid-line-strong ${className ?? ''}`}
    >
      <div className="grid w-full grid-cols-9">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`
            return (
              <SudokuCell
                key={key}
                row={r}
                col={c}
                value={cell.value}
                given={cell.given}
                notes={cell.notes}
                cageSum={cageLabels?.[r][c]}
                selected={selected !== null && selected.row === r && selected.col === c}
                peer={selected !== null && isPeer(r, c, selected)}
                sameValue={selectedValue !== 0 && cell.value === selectedValue && !(selected!.row === r && selected!.col === c)}
                conflict={cell.value !== 0 && conflicts.has(key)}
                rippleDelayMs={ripple && isPeer(r, c, ripple) ? (Math.abs(r - ripple.row) + Math.abs(c - ripple.col)) * RIPPLE_STEP_MS : undefined}
                rippleSeq={ripple?.seq}
                sweepDelayMs={solved ? (r + c) * SWEEP_STEP_MS : undefined}
                retractGhostValue={retractedCells?.get(key)}
                onRetractEnd={() => onRetractEnd?.(key)}
                hinted={!!hintedCells?.has(key)}
                focused={!!focusCells?.has(key)}
                onHintPulseEnd={() => onHintPulseEnd?.(key)}
                unitCompleteDelayMs={completedUnitCells?.get(key)}
                onUnitCompleteEnd={() => onUnitCompleteEnd?.(key)}
                onClick={onCellClick}
              />
            )
          }),
        )}
      </div>
      {cagePath && (
        <svg
          viewBox={`0 0 ${9 * CELL} ${9 * CELL}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-[1] h-full w-full"
          style={{ color: 'color-mix(in oklch, var(--color-ink) 45%, transparent)' }}
        >
          <path d={cagePath} fill="none" stroke="currentColor" strokeWidth={3.5} strokeDasharray="9 6" />
        </svg>
      )}
    </div>
  )
}
