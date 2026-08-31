import type { SudokuCellState } from '../state/sudokuTypes'
import { boxIndex } from '../engine/sudoku/types'
import { SudokuCell } from './SudokuCell'

interface RippleOrigin {
  row: number
  col: number
  seq: number
}

interface SudokuBoardProps {
  board: SudokuCellState[][]
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

const RIPPLE_STEP_MS = 25
const SWEEP_STEP_MS = 42

export function SudokuBoard({
  board,
  selected,
  conflicts,
  ripple,
  solved,
  onCellClick,
  retractedCells,
  onRetractEnd,
  hintedCells,
  onHintPulseEnd,
  completedUnitCells,
  onUnitCompleteEnd,
  className,
}: SudokuBoardProps) {
  const selectedValue = selected ? board[selected.row][selected.col].value : 0

  return (
    <div
      className={`mx-auto grid w-full grid-cols-9 overflow-hidden rounded-[20px] border-2 border-grid-line-strong ${className ?? ''}`}
    >
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
              onHintPulseEnd={() => onHintPulseEnd?.(key)}
              unitCompleteDelayMs={completedUnitCells?.get(key)}
              onUnitCompleteEnd={() => onUnitCompleteEnd?.(key)}
              onClick={onCellClick}
            />
          )
        }),
      )}
    </div>
  )
}
