import { useRef, useState } from 'react'

interface SheetDragHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void
}

interface SheetDrag {
  /** Live downward offset in px, 1:1 with the finger — apply as `translateY(dragY)` on
   *  the sheet. 0 whenever not mid-drag. */
  dragY: number
  /** True only while a drag is actually in progress — callers use this to skip the
   *  snap-back transition (no animation while the finger is still moving it). */
  dragging: boolean
  /** Spread onto the drag handle only (e.g. the small bar at the top of the sheet) —
   *  never the whole sheet, so scrolling the sheet's own content is unaffected. */
  handleProps: SheetDragHandlers
}

const DISMISS_THRESHOLD_PX = 80

/** Drag-down-to-dismiss for a bottom sheet's handle bar — follows the finger 1:1,
 *  releasing past DISMISS_THRESHOLD_PX calls onDismiss, otherwise it snaps back. */
export function useSheetDrag(onDismiss: () => void): SheetDrag {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startYRef = useRef<number | null>(null)

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    startYRef.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (startYRef.current === null) return
    setDragY(Math.max(0, e.clientY - startYRef.current))
  }

  function endDrag() {
    if (startYRef.current === null) return
    startYRef.current = null
    setDragging(false)
    if (dragY > DISMISS_THRESHOLD_PX) onDismiss()
    setDragY(0)
  }

  return {
    dragY,
    dragging,
    handleProps: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag },
  }
}
