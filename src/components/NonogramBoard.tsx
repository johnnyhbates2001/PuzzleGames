import { useMemo } from 'react'
import type { NonogramLevelRecord } from '../engine/nonogram/types'
import { contradictoryLines, type Mark } from '../engine/nonogram/validator'
import { NonogramCell } from './NonogramCell'

interface NonogramBoardProps {
  level: NonogramLevelRecord
  grid: Mark[][]
  onCellClick: (row: number, col: number) => void
  /** True once the grid matches the solution — triggers the one-shot diagonal
   *  solve-sweep across every cell before the win effect navigates away (see
   *  useGameCompletion). */
  solved?: boolean
  className?: string
}

const SWEEP_STEP_MS = 42

export function NonogramBoard({ level, grid, onCellClick, solved, className }: NonogramBoardProps) {
  const { size, rowClues, colClues } = level

  // Free, real-time, solution-independent feedback (see contradictoryLines) — never a
  // spoiler, so it's safe to recompute and show on every render.
  const { rows: badRows, cols: badCols } = useMemo(
    () => contradictoryLines(size, rowClues, colClues, grid),
    [size, rowClues, colClues, grid],
  )

  const cells = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push(
        <NonogramCell
          key={`${r},${c}`}
          row={r}
          col={c}
          mark={grid[r][c]}
          borderRight={c === size - 1 ? false : c % 5 === 4}
          borderBottom={r === size - 1 ? false : r % 5 === 4}
          sweepDelayMs={solved ? (r + c) * SWEEP_STEP_MS : undefined}
          onClick={onCellClick}
        />,
      )
    }
  }

  return (
    <div
      className={`grid w-full gap-x-1.5 gap-y-1 ${className ?? ''}`}
      style={{ gridTemplateColumns: `minmax(2rem, auto) 1fr` }}
    >
      <div />
      <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {colClues.map((clue, c) => (
          <div key={c} className="flex flex-col items-center justify-end gap-0.5 pb-1">
            {clue.map((n, i) => (
              <span
                key={i}
                className={`text-[min(2.6vw,12px)] leading-none font-bold tabular-nums ${
                  badCols.has(c) ? 'text-danger' : 'text-ink-muted'
                }`}
              >
                {n}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-col">
        {rowClues.map((clue, r) => (
          <div key={r} className="flex flex-1 items-center justify-end gap-1 pr-1.5">
            {clue.map((n, i) => (
              <span
                key={i}
                className={`text-[min(2.6vw,12px)] leading-none font-bold tabular-nums ${
                  badRows.has(r) ? 'text-danger' : 'text-ink-muted'
                }`}
              >
                {n}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div
        className="grid touch-none overflow-hidden rounded-[20px] border-2 border-grid-line-strong"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {cells}
      </div>
    </div>
  )
}
