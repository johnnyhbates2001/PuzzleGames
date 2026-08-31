import { useRef } from 'react'
import { boundingRect, clueIndexAt, rectCells, rectContains, type Coord, type PatchesLevelRecord } from '../engine/patches/types'
import { isMismatched, isRectFree, placedRectAt, type PlacedRect } from '../engine/patches/validator'
import { PatchesCell } from './PatchesCell'
import { useRegionColors } from '../hooks/useSkin'

interface RetractGhost {
  id: number
  rect: PlacedRect
}

interface PatchesBoardProps {
  level: PatchesLevelRecord
  placed: PlacedRect[]
  /** Drag state, lifted up to the reducer (see patchesReducer.ts) rather than kept
   *  locally — dragEnd needs to survive re-renders driven by DRAG_MOVE dispatches so
   *  the growing-rectangle preview below stays in sync with game state. */
  dragAnchor: Coord | null
  dragEnd: Coord | null
  onStartDrag: (row: number, col: number) => void
  /** Fired for every new cell a drag stroke enters, so the preview rectangle can grow
   *  live instead of only appearing once the drag commits. */
  onDragMove: (row: number, col: number) => void
  onCommitDrag: (row: number, col: number) => void
  onCancelDrag: () => void
  onRemoveRect: (row: number, col: number) => void
  /** True once every clue has a matching rectangle — triggers the one-shot diagonal
   *  solve-sweep across every cell before the win effect navigates away (see
   *  useGameCompletion). */
  solved?: boolean
  /** Rects an Undo just popped — see PatchesGamePage.tsx's diff-on-undo wiring. Each
   *  renders a fading ghost of its own fill color across its footprint, since the real
   *  state has already dropped it by the time we know. */
  retractedRects?: RetractGhost[]
  onRetractEnd?: (id: number) => void
  /** Cells (coordKey) a reveal-hint just placed — pulses once, gold. */
  hintedCells?: Set<string>
  onHintPulseEnd?: (key: string) => void
  className?: string
}

const SWEEP_STEP_MS = 42
/** Sentinel "region id" for a cell inside the live drag preview, for border-drawing
 *  purposes only — distinct from every real placed-rect index (>=0), from -1 (empty),
 *  and from -2 (used below to force a border at the grid's outer edge). */
const PREVIEW_REGION = -3

function cellFromPoint(clientX: number, clientY: number): { row: number; col: number } | null {
  const el = document.elementFromPoint(clientX, clientY)
  const button = el?.closest('button[data-row]') as HTMLElement | null
  if (!button) return null
  return { row: Number(button.dataset.row), col: Number(button.dataset.col) }
}

export function PatchesBoard({
  level,
  placed,
  dragAnchor,
  dragEnd,
  onStartDrag,
  onDragMove,
  onCommitDrag,
  onCancelDrag,
  onRemoveRect,
  solved,
  retractedRects,
  onRetractEnd,
  hintedCells,
  onHintPulseEnd,
  className,
}: PatchesBoardProps) {
  const regionColors = useRegionColors()
  const draggingRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const lastMoveKeyRef = useRef<string | null>(null)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const coord = cellFromPoint(e.clientX, e.clientY)
    if (!coord) return

    const placedIdx = placedRectAt(placed, coord)
    if (placedIdx !== -1) {
      onRemoveRect(coord.row, coord.col)
      return
    }

    const isClueCell = level.clues.some((c) => c.cell.row === coord.row && c.cell.col === coord.col)
    if (!isClueCell) return

    draggingRef.current = true
    pointerIdRef.current = e.pointerId
    lastMoveKeyRef.current = `${coord.row},${coord.col}`
    e.currentTarget.setPointerCapture(e.pointerId)
    onStartDrag(coord.row, coord.col)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    const coord = cellFromPoint(e.clientX, e.clientY)
    if (!coord) return
    const key = `${coord.row},${coord.col}`
    if (key === lastMoveKeyRef.current) return
    lastMoveKeyRef.current = key
    onDragMove(coord.row, coord.col)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    draggingRef.current = false
    pointerIdRef.current = null
    lastMoveKeyRef.current = null
    const coord = cellFromPoint(e.clientX, e.clientY)
    if (coord) onCommitDrag(coord.row, coord.col)
    else onCancelDrag()
  }

  function handlePointerCancel() {
    if (!draggingRef.current) return
    draggingRef.current = false
    pointerIdRef.current = null
    lastMoveKeyRef.current = null
    onCancelDrag()
  }

  const coveredBy: number[][] = Array.from({ length: level.size }, () => new Array(level.size).fill(-1))
  placed.forEach((p, i) => {
    for (let r = p.rect.row; r < p.rect.row + p.rect.height; r++) {
      for (let c = p.rect.col; c < p.rect.col + p.rect.width; c++) coveredBy[r][c] = i
    }
  })

  // Ghost coverage from recently-undone rects — keyed by cell so each cell can render
  // its own ghost's color and fire that ghost's own onRetractEnd once its animation ends.
  const ghostAt = new Map<string, { id: number; color: string }>()
  retractedRects?.forEach(({ id, rect }) => {
    const color = regionColors[rect.clueIndex % regionColors.length]
    rectCells(rect.rect).forEach((c) => ghostAt.set(`${c.row},${c.col}`, { id, color }))
  })

  // Live preview: the rectangle the current drag would commit if released right now —
  // grown from the anchor clue to wherever the pointer currently is (dragEnd), tinted
  // danger-red instead of the clue's own color whenever that placement is actually
  // impossible (overlaps something), so the player sees it's invalid before releasing.
  const previewClueIndex = dragAnchor ? clueIndexAt(level.clues, dragAnchor) : -1
  const previewRect = dragAnchor && dragEnd && previewClueIndex !== -1 ? boundingRect(dragAnchor, dragEnd, level.size) : null
  const previewValid = previewRect ? isRectFree(placed, level.clues, previewRect, previewClueIndex) : false
  const previewColor = previewValid ? regionColors[previewClueIndex % regionColors.length] : 'var(--color-danger)'

  function regionAt(r: number, c: number): number {
    if (previewRect && rectContains(previewRect, { row: r, col: c })) return PREVIEW_REGION
    return coveredBy[r][c]
  }

  // Only the most-recently-placed rect gets a fill-in stagger — older rects are
  // already-settled state, not a fresh appearance.
  const lastIdx = placed.length - 1
  const lastAnchor = lastIdx >= 0 ? placed[lastIdx].anchor : undefined

  const cells = []
  for (let r = 0; r < level.size; r++) {
    for (let c = 0; c < level.size; c++) {
      const placedIdx = coveredBy[r][c]
      const regionIdx = regionAt(r, c)
      const clue = level.clues.find((cl) => cl.cell.row === r && cl.cell.col === c) ?? null
      const rightIdx = c < level.size - 1 ? regionAt(r, c + 1) : -2
      const bottomIdx = r < level.size - 1 ? regionAt(r + 1, c) : -2
      const fillDelayMs =
        placedIdx === lastIdx && lastAnchor ? (Math.abs(r - lastAnchor.row) + Math.abs(c - lastAnchor.col)) * 25 : undefined
      const key = `${r},${c}`
      const ghost = ghostAt.get(key)

      cells.push(
        <PatchesCell
          key={key}
          row={r}
          col={c}
          clueArea={clue?.area ?? null}
          clueShape={clue?.shape ?? null}
          fillColor={placedIdx === -1 ? null : regionColors[placed[placedIdx].clueIndex % regionColors.length]}
          fillDelayMs={fillDelayMs}
          previewColor={regionIdx === PREVIEW_REGION ? previewColor : null}
          mismatched={placedIdx !== -1 && isMismatched(placed[placedIdx].rect, level.clues[placed[placedIdx].clueIndex])}
          borderRight={regionIdx !== rightIdx}
          borderBottom={regionIdx !== bottomIdx}
          sweepDelayMs={solved ? (r + c) * SWEEP_STEP_MS : undefined}
          retractGhostColor={placedIdx === -1 ? (ghost?.color ?? null) : null}
          onRetractEnd={ghost ? () => onRetractEnd?.(ghost.id) : undefined}
          hinted={!!hintedCells?.has(key)}
          onHintPulseEnd={() => onHintPulseEnd?.(key)}
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
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {cells}
    </div>
  )
}
