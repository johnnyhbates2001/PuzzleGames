import { useRef } from 'react'
import type { PatchesLevelRecord } from '../engine/patches/types'
import { isMismatched, placedRectAt, type PlacedRect } from '../engine/patches/validator'
import { PatchesCell } from './PatchesCell'
import { useRegionColors } from '../hooks/useSkin'

interface PatchesBoardProps {
  level: PatchesLevelRecord
  placed: PlacedRect[]
  onStartDrag: (row: number, col: number) => void
  onCommitDrag: (row: number, col: number) => void
  onCancelDrag: () => void
  onRemoveRect: (row: number, col: number) => void
  className?: string
}

function cellFromPoint(clientX: number, clientY: number): { row: number; col: number } | null {
  const el = document.elementFromPoint(clientX, clientY)
  const button = el?.closest('button[data-row]') as HTMLElement | null
  if (!button) return null
  return { row: Number(button.dataset.row), col: Number(button.dataset.col) }
}

export function PatchesBoard({ level, placed, onStartDrag, onCommitDrag, onCancelDrag, onRemoveRect, className }: PatchesBoardProps) {
  const regionColors = useRegionColors()
  const draggingRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)

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
    e.currentTarget.setPointerCapture(e.pointerId)
    onStartDrag(coord.row, coord.col)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    draggingRef.current = false
    pointerIdRef.current = null
    const coord = cellFromPoint(e.clientX, e.clientY)
    if (coord) onCommitDrag(coord.row, coord.col)
    else onCancelDrag()
  }

  function handlePointerCancel() {
    if (!draggingRef.current) return
    draggingRef.current = false
    pointerIdRef.current = null
    onCancelDrag()
  }

  const coveredBy: number[][] = Array.from({ length: level.size }, () => new Array(level.size).fill(-1))
  placed.forEach((p, i) => {
    for (let r = p.rect.row; r < p.rect.row + p.rect.height; r++) {
      for (let c = p.rect.col; c < p.rect.col + p.rect.width; c++) coveredBy[r][c] = i
    }
  })

  // Only the most-recently-placed rect gets a fill-in stagger — older rects are
  // already-settled state, not a fresh appearance.
  const lastIdx = placed.length - 1
  const lastAnchor = lastIdx >= 0 ? placed[lastIdx].anchor : undefined

  const cells = []
  for (let r = 0; r < level.size; r++) {
    for (let c = 0; c < level.size; c++) {
      const placedIdx = coveredBy[r][c]
      const clue = level.clues.find((cl) => cl.cell.row === r && cl.cell.col === c) ?? null
      const rightIdx = c < level.size - 1 ? coveredBy[r][c + 1] : -2
      const bottomIdx = r < level.size - 1 ? coveredBy[r + 1][c] : -2
      const fillDelayMs =
        placedIdx === lastIdx && lastAnchor ? (Math.abs(r - lastAnchor.row) + Math.abs(c - lastAnchor.col)) * 25 : undefined

      cells.push(
        <PatchesCell
          key={`${r},${c}`}
          row={r}
          col={c}
          clueArea={clue?.area ?? null}
          clueShape={clue?.shape ?? null}
          fillColor={placedIdx === -1 ? null : regionColors[placed[placedIdx].clueIndex % regionColors.length]}
          fillDelayMs={fillDelayMs}
          mismatched={placedIdx !== -1 && isMismatched(placed[placedIdx].rect, level.clues[placed[placedIdx].clueIndex])}
          borderRight={placedIdx !== rightIdx}
          borderBottom={placedIdx !== bottomIdx}
        />,
      )
    }
  }

  return (
    <div
      className={`mx-auto grid w-full touch-none overflow-hidden rounded-[20px] border-2 border-grid-line-strong ${className ?? ''}`}
      style={{ gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))` }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {cells}
    </div>
  )
}
