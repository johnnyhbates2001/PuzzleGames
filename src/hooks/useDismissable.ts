import { useEffect, useState } from 'react'

interface DismissableState {
  /** True while the sheet should still be in the DOM — stays true for `exitDurationMs`
   *  after `open` flips false, so the exit animation has something to animate. */
  shouldRender: boolean
  /** True only during that trailing exit window — drives the exit animation class. */
  exiting: boolean
}

/** Keeps a sheet mounted for `exitDurationMs` after its `open` prop goes false, so a
 *  CSS exit animation (e.g. .anim-sheet-down) has time to play instead of the content
 *  just vanishing. There's no existing precedent for this in the codebase — every sheet
 *  today does a hard unmount on close. */
export function useDismissable(open: boolean, exitDurationMs: number): DismissableState {
  const [shouldRender, setShouldRender] = useState(open)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      setExiting(false)
      return
    }
    if (!shouldRender) return
    setExiting(true)
    const timer = setTimeout(() => {
      setShouldRender(false)
      setExiting(false)
    }, exitDurationMs)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exitDurationMs])

  return { shouldRender, exiting }
}
