import type { SudokuCellState } from '../state/sudokuTypes'
import { boxIndex } from '../engine/sudoku/types'
import { SudokuCell } from './SudokuCell'

interface SudokuBoardProps {
  board: SudokuCellState[][]
  selected: { row: number; col: number } | null
  conflicts: Set<string>
  onCellClick: (row: number, col: number) => void
  className?: string
}

function isPeer(row: number, col: number, selected: { row: number; col: number }): boolean {
  if (row === selected.row && col === selected.col) return false
  return row === selected.row || col === selected.col || boxIndex(row, col) === boxIndex(selected.row, selected.col)
}

export function SudokuBoard({ board, selected, conflicts, onCellClick, className }: SudokuBoardProps) {
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
            onClick={onCellClick}
          />
        )),
      )}
    </div>
  )
}
