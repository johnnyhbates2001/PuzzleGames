import { useRef } from 'react'
import { coordKey, edgeKey, type Coord, type ZipLevelRecord } from '../engine/zip/types'
import { ZipCell } from './ZipCell'
import { useEquippedCosmetic } from '../hooks/useCosmetics'

interface ZipBoardProps {
  level: ZipLevelRecord
  path: Coord[]
  onCellEnter: (row: number, col: number) => void
  /** The cell an illegal move was just attempted on, if any — drives a one-shot shake. */
  rejectedCell: Coord | null
  /** Fired once the shake animation finishes, so the caller can clear rejectedCell. */
  onRejectedShakeEnd: () => void
  /** 1-based number of the checkpoint the path just reached, if any this render —
   *  drives that checkpoint's pulse (see ZipGamePage.tsx). Omitted by the static
   *  completion-screen preview, which has nothing to pulse. */
  justReachedCheckpoint?: number | null
  /** Fired once the pulse animation finishes, so the caller can clear it. */
  onCheckpointPulseEnd?: () => void
  /** True once the path is complete — triggers the one-shot diagonal solve-sweep
   *  across every cell before the win effect navigates away (see useGameCompletion). */
  solved?: boolean
  /** Cells (coordKey) an Undo just dropped from the path — see ZipGamePage.tsx's diff-
   *  on-undo wiring. Renders a fading ghost of the path tint instead of nothing, since
   *  the real state has already dropped it by the time we know. */
  retractedCells?: Set<string>
  onRetractEnd?: (key: string) => void
  /** Cells (coordKey) a reveal-hint just appended — pulses once, gold. */
  hintedCells?: Set<string>
  onHintPulseEnd?: (key: string) => void
  className?: string
}

const SWEEP_STEP_MS = 42
// Stroke width as a fraction of one grid cell (viewBox units == cells) — ~21px on a
// typical ~50px cell, matching the revised design's single continuous 21px stroke.
const STROKE_WIDTH = 0.42

/** Zip 'line styles' cosmetic (see cosmetics.ts). Most styles just tweak the main
 *  polyline's dasharray/class; 'glow' and 'braided' layer an extra polyline behind/on
 *  top instead, since a CSS `filter` on an SVG element scaled by its own viewBox is
 *  unreliable across browsers — an extra stroke is simpler and always renders. */
function zipLineStyleProps(style: string): { dasharray?: string; className?: string } {
  switch (style) {
    case 'dashed':
      return { dasharray: '0.32 0.22' }
    case 'dotted':
      return { dasharray: '0.05 0.22' }
    case 'pulse':
      return { className: 'anim-zip-pulse' }
    default:
      return {}
  }
}

function cellFromPoint(clientX: number, clientY: number): { row: number; col: number } | null {
  const el = document.elementFromPoint(clientX, clientY)
  const button = el?.closest('button[data-row]') as HTMLElement | null
  if (!button) return null
  return { row: Number(button.dataset.row), col: Number(button.dataset.col) }
}

export function ZipBoard({
  level,
  path,
  onCellEnter,
  rejectedCell,
  onRejectedShakeEnd,
  justReachedCheckpoint = null,
  onCheckpointPulseEnd = () => {},
  solved,
  retractedCells,
  onRetractEnd,
  hintedCells,
  onHintPulseEnd,
  className,
}: ZipBoardProps) {
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

  const lineStyle = useEquippedCosmetic('zipLineStyle')
  const lineStyleProps = zipLineStyleProps(lineStyle)
  const points = path.map((p) => `${p.col + 0.5},${p.row + 0.5}`).join(' ')

  const pathIndexOf = new Map<string, number>()
  path.forEach((c, i) => pathIndexOf.set(coordKey(c), i))
  const cpIndexOf = new Map<string, number>()
  level.checkpoints.forEach((c, i) => cpIndexOf.set(coordKey(c), i))
  const wallSet = new Set(level.walls)

  const cells = []
  for (let r = 0; r < level.size; r++) {
    for (let c = 0; c < level.size; c++) {
      const key = coordKey({ row: r, col: c })
      const inPath = pathIndexOf.has(key)
      const checkpointNumber = cpIndexOf.has(key) ? cpIndexOf.get(key)! + 1 : null

      cells.push(
        <ZipCell
          key={key}
          row={r}
          col={c}
          checkpointNumber={checkpointNumber}
          inPath={inPath}
          wallRight={c < level.size - 1 && wallSet.has(edgeKey({ row: r, col: c }, { row: r, col: c + 1 }))}
          wallBottom={r < level.size - 1 && wallSet.has(edgeKey({ row: r, col: c }, { row: r + 1, col: c }))}
          shake={rejectedCell?.row === r && rejectedCell?.col === c}
          onShakeEnd={onRejectedShakeEnd}
          justReached={checkpointNumber !== null && checkpointNumber === justReachedCheckpoint}
          onCheckpointPulseEnd={onCheckpointPulseEnd}
          sweepDelayMs={solved ? (r + c) * SWEEP_STEP_MS : undefined}
          retracting={!!retractedCells?.has(key)}
          onRetractEnd={() => onRetractEnd?.(key)}
          hinted={!!hintedCells?.has(key)}
          onHintPulseEnd={() => onHintPulseEnd?.(key)}
        />,
      )
    }
  }

  return (
    <div
      className={`relative mx-auto grid w-full touch-none overflow-hidden rounded-[20px] border-2 border-grid-line-strong ${className ?? ''}`}
      style={{ gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      {cells}
      {path.length > 1 && (
        <svg
          viewBox={`0 0 ${level.size} ${level.size}`}
          className="pointer-events-none absolute inset-0 size-full"
          preserveAspectRatio="none"
        >
          {lineStyle === 'glow' && (
            <polyline
              points={points}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={STROKE_WIDTH * 2.1}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.4}
            />
          )}
          <polyline
            points={points}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={lineStyleProps.dasharray}
            className={lineStyleProps.className}
          />
          {lineStyle === 'braided' && (
            <polyline
              points={points}
              fill="none"
              stroke="var(--color-bg)"
              strokeWidth={STROKE_WIDTH * 0.4}
              strokeLinecap="round"
              strokeDasharray="0.22 0.22"
              opacity={0.6}
            />
          )}
        </svg>
      )}
    </div>
  )
}
