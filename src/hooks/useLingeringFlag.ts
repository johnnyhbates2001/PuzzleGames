import { useEffect, useRef, useState } from 'react'

/** True whenever `active` is true, and for `holdMs` after it was last true — even if
 *  `active` itself flips back to false sooner. Used for the conflict/mismatch danger
 *  tint, which should read as noticed for a beat rather than vanishing the instant the
 *  player's next move happens to resolve it. Restarts the hold on every fresh rising
 *  edge of `active`. */
export function useLingeringFlag(active: boolean, holdMs: number): boolean {
  // Only the "still lingering after active went false" case needs state — the "active
  // right now" case is read straight from the prop below, not mirrored into state.
  const [lingering, setLingering] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasActiveRef = useRef(active)

  useEffect(() => {
    if (active && !wasActiveRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setLingering(true)
      timerRef.current = setTimeout(() => setLingering(false), holdMs)
    }
    wasActiveRef.current = active
  }, [active, holdMs])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return active || lingering
}
