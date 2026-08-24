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
  onCellClick: (row: number, col: number) => void
  className?: string
}

function isPeer(row: number, col: number, origin: { row: number; col: number }): boolean {
  if (row === origin.row && col === origin.col) return false
  return row === origin.row || col === origin.col || boxIndex(row, col) === boxIndex(origin.row, origin.col)
}

const RIPPLE_STEP_MS = 25

export function SudokuBoard({ board, selected, conflicts, ripple, onCellClick, className }: SudokuBoardProps) {
  const selectedValue = selected ? board[selected.row][selected.col].value : 0

  return (
    <div
      className={`mx-auto grid w-full grid-cols-9 overflow-hidden rounded-[20px] border-2 border-grid-line-strong ${className ?? ''}`}
    >
      {board.map((row, r) =>
        row.map((cell, c) => (
          <SudokuCell
            key={`${r},${c}`}
            row={r}
            col={c}
            value={cell.value}
            given={cell.given}
            notes={cell.notes}
            selected={selected !== null && selected.row === r && selected.col === c}
            peer={selected !== null && isPeer(r, c, selected)}
            sameValue={selectedValue !== 0 && cell.value === selectedValue && !(selected!.row === r && selected!.col === c)}
            conflict={cell.value !== 0 && conflicts.has(`${r},${c}`)}
            rippleDelayMs={ripple && isPeer(r, c, ripple) ? (Math.abs(r - ripple.row) + Math.abs(c - ripple.col)) * RIPPLE_STEP_MS : undefined}
            rippleSeq={ripple?.seq}
            onClick={onCellClick}
          />
        )),
      )}
    </div>
  )
}
