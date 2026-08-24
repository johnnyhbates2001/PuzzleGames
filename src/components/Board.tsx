import { useRef } from 'react'
import type { LevelRecord } from '../engine/types'
import { coordKey } from '../engine/types'
import type { CellState } from '../state/types'
import { hasX } from '../state/types'
import { Cell } from './Cell'
import { useRegionColors } from '../hooks/useSkin'

interface BoardProps {
  level: LevelRecord
  board: CellState[][]
  conflicts: Set<string>
  onCellClick: (row: number, col: number) => void
  /** Fired once, the instant a pointer-drag grows beyond its starting cell. */
  onDragStart: () => void
  /** Fired for every new cell a confirmed drag stroke enters (including the start
   *  cell, retroactively). `mode` is fixed for the whole stroke, decided by the start
   *  cell's X state at the moment the drag is confirmed. */
  onCellDragEnter: (row: number, col: number, mode: 'add' | 'erase') => void
  className?: string
}

interface Coord {
  row: number
  col: number
}

const AUTO_X_STEP_MS = 20

/** Delay (ms) for an auto-X'd cell's entrance animation: the Chebyshev distance
 *  (a queen's reach — same row/col/diagonal count as 1 step) from the *nearest*
 *  queen that ruled it out, so cells further from the queen animate in later and
 *  the X's read as propagating outward rather than all appearing at once. Cells
 *  ruled out by multiple queens use whichever queen is closest. */
function autoXDelayMs(row: number, col: number, cell: CellState): number | undefined {
  if (cell.queen || cell.autoXSources.size === 0) return undefined
  let nearest = Infinity
  for (const sourceId of cell.autoXSources) {
    const [qr, qc] = sourceId.split(',').map(Number)
    const distance = Math.max(Math.abs(row - qr), Math.abs(col - qc))
    if (distance < nearest) nearest = distance
  }
  return nearest * AUTO_X_STEP_MS
}

function cellFromPoint(clientX: number, clientY: number): Coord | null {
  const el = document.elementFromPoint(clientX, clientY)
  const button = el?.closest('button[data-row]') as HTMLElement | null
  if (!button) return null
  return { row: Number(button.dataset.row), col: Number(button.dataset.col) }
}

export function Board({ level, board, conflicts, onCellClick, onDragStart, onCellDragEnter, className }: BoardProps) {
  const regionColors = useRegionColors()
  // Gesture state lives in refs, not React state — pointermove fires far too often
  // (and far too latency-sensitively) to route through re-renders, and refs are stable
  // across StrictMode's dev double-invoke of render.
  const startCellRef = useRef<Coord | null>(null)
  const visitedRef = useRef<Set<string>>(new Set())
  const dragConfirmedRef = useRef(false)
  const dragModeRef = useRef<'add' | 'erase'>('add')
  const pointerIdRef = useRef<number | null>(null)
  // Armed the instant a drag is confirmed; consumed by onClickCapture to swallow the
  // trailing click a confirmed drag produces. Deliberately NOT cleared by pointerup/
  // pointercancel (that click may arrive after them, or never arrive at all if release
  // happens off-board) — only by being consumed, or defensively at the next pointerdown.
  const suppressNextClickRef = useRef(false)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const coord = cellFromPoint(e.clientX, e.clientY)
    if (!coord) return
    suppressNextClickRef.current = false
    startCellRef.current = coord
    visitedRef.current = new Set([coordKey(coord)])
    dragConfirmedRef.current = false
    // Deliberately NOT capturing the pointer here: capturing before a drag is
    // confirmed stops the browser from ever dispatching the trailing click event to
    // the actual button underneath (observed directly — a plain tap silently stopped
    // registering once capture was acquired unconditionally on pointerdown). Capture
    // is acquired below, only once a drag is actually confirmed, so a plain tap never
    // touches pointer capture and gets fully native click behavior.
    pointerIdRef.current = e.pointerId
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = startCellRef.current
    if (!start) return
    const coord = cellFromPoint(e.clientX, e.clientY)
    if (!coord) return // finger is over a grid gap pixel — not a cell, ignore this move
    const key = coordKey(coord)
    if (visitedRef.current.has(key)) return
    visitedRef.current.add(key)

    if (!dragConfirmedRef.current) {
      dragConfirmedRef.current = true
      dragModeRef.current = hasX(board[start.row][start.col]) ? 'erase' : 'add'
      suppressNextClickRef.current = true
      // Capture now that this is a real drag — keeps pointermove/pointerup arriving
      // even if the finger strays outside the board's bounds mid-swipe.
      if (pointerIdRef.current !== null) e.currentTarget.setPointerCapture(pointerIdRef.current)
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
  }

  function handleClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (!suppressNextClickRef.current) return
    e.preventDefault()
    e.stopPropagation()
    suppressNextClickRef.current = false
  }

  return (
    <div
      className={`mx-auto grid w-full touch-none gap-0.5 overflow-hidden rounded-[20px] bg-grid-gap p-0.5 ${className ?? ''}`}
      style={{ gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onClickCapture={handleClickCapture}
    >
      {board.map((row, r) =>
        row.map((cell, c) => (
          <Cell
            key={`${r},${c}`}
            row={r}
            col={c}
            cell={cell}
            regionColor={regionColors[level.regions[r][c] % regionColors.length]}
            conflict={cell.queen && conflicts.has(coordKey({ row: r, col: c }))}
            autoXDelayMs={autoXDelayMs(r, c, cell)}
            onClick={onCellClick}
          />
        )),
      )}
    </div>
  )
}
