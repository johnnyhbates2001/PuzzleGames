import { useMemo, useRef, useState } from 'react'
import { cluesForLine, coordKey, type Coord, type NonogramLevelRecord } from '../engine/nonogram/types'
import { contradictoryLines, type Mark } from '../engine/nonogram/validator'
import type { MarkMode } from '../state/nonogramReducer'
import { NonogramCell } from './NonogramCell'

interface NonogramBoardProps {
  level: NonogramLevelRecord
  grid: Mark[][]
  /** Which mark a tap/drag currently targets — see the mode-toggle button in
   *  NonogramControls. */
  markMode: MarkMode
  onCellClick: (row: number, col: number) => void
  /** Fired once, the instant a pointer-drag grows beyond its starting cell. */
  onDragStart: () => void
  /** Fired for every new cell a confirmed drag stroke enters (including the start
   *  cell, retroactively). `mode` is fixed for the whole stroke, decided by whether
   *  the start cell already carries the current mode's mark (see Board.tsx — same
   *  add/erase gesture Queens uses for its X's, generalized to either mark here). */
  onCellDragEnter: (row: number, col: number, mode: 'add' | 'erase') => void
  /** True once the grid matches the solution — triggers the one-shot diagonal
   *  solve-sweep across every cell before the win effect navigates away (see
   *  useGameCompletion). */
  solved?: boolean
  /** Cells (coordKey) an Undo just cleared, mapped to the mark that was removed — see
   *  NonogramGamePage.tsx's diff-on-undo wiring. Renders a fading ghost of that mark
   *  instead of nothing, since the real state has already gone empty by the time we know. */
  retractedCells?: Map<string, Mark>
  onRetractEnd?: (key: string) => void
  /** Cells (coordKey) a reveal-hint just marked — pulses once, gold. */
  hintedCells?: Set<string>
  onHintPulseEnd?: (key: string) => void
  className?: string
}

const SWEEP_STEP_MS = 42

function targetMark(mode: MarkMode): Mark {
  return mode === 'fill' ? 'filled' : 'x'
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i])
}

function cellFromPoint(clientX: number, clientY: number): Coord | null {
  const el = document.elementFromPoint(clientX, clientY)
  const button = el?.closest('button[data-row]') as HTMLElement | null
  if (!button) return null
  return { row: Number(button.dataset.row), col: Number(button.dataset.col) }
}

export function NonogramBoard({
  level,
  grid,
  markMode,
  onCellClick,
  onDragStart,
  onCellDragEnter,
  solved,
  retractedCells,
  onRetractEnd,
  hintedCells,
  onHintPulseEnd,
  className,
}: NonogramBoardProps) {
  const { size, rowClues, colClues } = level

  // Free, real-time, solution-independent feedback (see contradictoryLines) — never a
  // spoiler, so it's safe to recompute and show on every render.
  const { rows: badRows, cols: badCols } = useMemo(
    () => contradictoryLines(size, rowClues, colClues, grid),
    [size, rowClues, colClues, grid],
  )

  // Also solution-independent (compares the grid's own run-lengths to the printed
  // clue, not to the answer) — a row/col whose fill pattern exactly matches its clue
  // gets its numbers struck through, reversing instantly if a later move breaks it.
  const { satisfiedRows, satisfiedCols } = useMemo(() => {
    const rows = new Set<number>()
    const cols = new Set<number>()
    for (let r = 0; r < size; r++) {
      if (arraysEqual(cluesForLine(grid[r].map((m) => m === 'filled')), rowClues[r])) rows.add(r)
    }
    for (let c = 0; c < size; c++) {
      if (arraysEqual(cluesForLine(grid.map((row) => row[c] === 'filled')), colClues[c])) cols.add(c)
    }
    return { satisfiedRows: rows, satisfiedCols: cols }
  }, [size, rowClues, colClues, grid])

  // Gesture state lives in refs, not React state — pointermove fires far too often to
  // route through re-renders (see Board.tsx, which this drag gesture mirrors).
  const startCellRef = useRef<Coord | null>(null)
  const visitedRef = useRef<Set<string>>(new Set())
  const dragConfirmedRef = useRef(false)
  const dragModeRef = useRef<'add' | 'erase'>('add')
  const pointerIdRef = useRef<number | null>(null)
  const suppressNextClickRef = useRef(false)
  // Promoted to state (unlike the gesture refs above) specifically so it can drive a
  // render — cells read this to suppress their per-cell pop-in while a drag-fill is in
  // progress, so a fast drag across many cells doesn't stutter with N little pops.
  const [dragging, setDragging] = useState(false)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const coord = cellFromPoint(e.clientX, e.clientY)
    if (!coord) return
    suppressNextClickRef.current = false
    startCellRef.current = coord
    visitedRef.current = new Set([coordKey(coord)])
    dragConfirmedRef.current = false
    pointerIdRef.current = e.pointerId
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = startCellRef.current
    if (!start) return
    const coord = cellFromPoint(e.clientX, e.clientY)
    if (!coord) return
    const key = coordKey(coord)
    if (visitedRef.current.has(key)) return
    visitedRef.current.add(key)

    if (!dragConfirmedRef.current) {
      dragConfirmedRef.current = true
      const target = targetMark(markMode)
      dragModeRef.current = grid[start.row][start.col] === target ? 'erase' : 'add'
      suppressNextClickRef.current = true
      if (pointerIdRef.current !== null) e.currentTarget.setPointerCapture(pointerIdRef.current)
      setDragging(true)
      onDragStart()
      onCellDragEnter(start.row, start.col, dragModeRef.current)
    }
    onCellDragEnter(coord.row, coord.col, dragModeRef.current)
  }

  function endGesture() {
    startCellRef.current = null
    visitedRef.current = new Set()
    dragConfirmedRef.current = false
    pointerIdRef.current = null
    setDragging(false)
  }

  function handleClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (!suppressNextClickRef.current) return
    e.preventDefault()
    e.stopPropagation()
    suppressNextClickRef.current = false
  }

  const cells = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const key = `${r},${c}`
      cells.push(
        <NonogramCell
          key={key}
          row={r}
          col={c}
          mark={grid[r][c]}
          dragging={dragging}
          borderRight={c === size - 1 ? false : c % 5 === 4}
          borderBottom={r === size - 1 ? false : r % 5 === 4}
          sweepDelayMs={solved ? (r + c) * SWEEP_STEP_MS : undefined}
          retractGhostMark={retractedCells?.get(key) ?? null}
          onRetractEnd={() => onRetractEnd?.(key)}
          hinted={!!hintedCells?.has(key)}
          onHintPulseEnd={() => onHintPulseEnd?.(key)}
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
                className={`text-[min(2.6vw,12px)] leading-none font-bold tabular-nums transition-all duration-[120ms] ${
                  badCols.has(c) ? 'text-danger' : satisfiedCols.has(c) ? 'text-ink-muted line-through opacity-[0.32]' : 'text-ink-muted'
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
                className={`text-[min(2.6vw,12px)] leading-none font-bold tabular-nums transition-all duration-[120ms] ${
                  badRows.has(r) ? 'text-danger' : satisfiedRows.has(r) ? 'text-ink-muted line-through opacity-[0.32]' : 'text-ink-muted'
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onClickCapture={handleClickCapture}
      >
        {cells}
      </div>
    </div>
  )
}
