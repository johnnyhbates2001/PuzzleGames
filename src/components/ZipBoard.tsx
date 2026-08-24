import { useRef } from 'react'
import { coordKey, edgeKey, type Coord, type ZipLevelRecord } from '../engine/zip/types'
import { ZipCell } from './ZipCell'

interface ZipBoardProps {
  level: ZipLevelRecord
  path: Coord[]
  onCellEnter: (row: number, col: number) => void
  /** The cell an illegal move was just attempted on, if any — drives a one-shot shake. */
  rejectedCell: Coord | null
  /** Fired once the shake animation finishes, so the caller can clear rejectedCell. */
  onRejectedShakeEnd: () => void
  /** True once the path is complete — triggers the one-shot diagonal solve-sweep
   *  across every cell before the win effect navigates away (see useGameCompletion). */
  solved?: boolean
  className?: string
}

const SWEEP_STEP_MS = 42

function cellFromPoint(clientX: number, clientY: number): { row: number; col: number } | null {
  const el = document.elementFromPoint(clientX, clientY)
  const button = el?.closest('button[data-row]') as HTMLElement | null
  if (!button) return null
  return { row: Number(button.dataset.row), col: Number(button.dataset.col) }
}

export function ZipBoard({ level, path, onCellEnter, rejectedCell, onRejectedShakeEnd, solved, className }: ZipBoardProps) {
  // Every cell the pointer passes over (starting with the initial press) is routed
  // through the same onCellEnter call — unlike Board.tsx's Queens gesture, there's no
  // tap-vs-drag mode ambiguity to resolve here: a plain tap and a drag stroke mean the
  // exact same thing (try to enter this cell), so pointer capture can start
  // immediately instead of waiting for a "confirmed drag".
  const pointerIdRef = useRef<number | null>(null)
  const lastCellKeyRef = useRef<string | null>(null)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const coord = cellFromPoint(e.clientX, e.clientY)
    if (!coord) return
    pointerIdRef.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    lastCellKeyRef.current = `${coord.row},${coord.col}`
    onCellEnter(coord.row, coord.col)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current === null) return
    const coord = cellFromPoint(e.clientX, e.clientY)
    if (!coord) return
    const key = `${coord.row},${coord.col}`
    if (key === lastCellKeyRef.current) return
    lastCellKeyRef.current = key
    onCellEnter(coord.row, coord.col)
  }

  function endGesture() {
    pointerIdRef.current = null
    lastCellKeyRef.current = null
  }

  const pathIndexOf = new Map<string, number>()
  path.forEach((c, i) => pathIndexOf.set(coordKey(c), i))
  const cpIndexOf = new Map<string, number>()
  level.checkpoints.forEach((c, i) => cpIndexOf.set(coordKey(c), i))
  const wallSet = new Set(level.walls)

  const cells = []
  for (let r = 0; r < level.size; r++) {
    for (let c = 0; c < level.size; c++) {
      const key = coordKey({ row: r, col: c })
      const idx = pathIndexOf.get(key)
      const inPath = idx !== undefined
      const prev = inPath && idx > 0 ? path[idx - 1] : null
      const next = inPath && idx < path.length - 1 ? path[idx + 1] : null
      const touches = (other: Coord | null, row: number, col: number) => other !== null && other.row === row && other.col === col

      cells.push(
        <ZipCell
          key={key}
          row={r}
          col={c}
          checkpointNumber={cpIndexOf.has(key) ? cpIndexOf.get(key)! + 1 : null}
          inPath={inPath}
          isPathEnd={inPath && idx === path.length - 1}
          connUp={touches(prev, r - 1, c) || touches(next, r - 1, c)}
          connDown={touches(prev, r + 1, c) || touches(next, r + 1, c)}
          connLeft={touches(prev, r, c - 1) || touches(next, r, c - 1)}
          connRight={touches(prev, r, c + 1) || touches(next, r, c + 1)}
          wallRight={c < level.size - 1 && wallSet.has(edgeKey({ row: r, col: c }, { row: r, col: c + 1 }))}
          wallBottom={r < level.size - 1 && wallSet.has(edgeKey({ row: r, col: c }, { row: r + 1, col: c }))}
          shake={rejectedCell?.row === r && rejectedCell?.col === c}
          onShakeEnd={onRejectedShakeEnd}
          sweepDelayMs={solved ? (r + c) * SWEEP_STEP_MS : undefined}
        />,
      )
    }
  }

  return (
    <div
      className={`mx-auto grid w-full touch-none overflow-hidden rounded-[20px] border-2 border-grid-line-strong ${className ?? ''}`}
      style={{ gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      {cells}
    </div>
  )
}
