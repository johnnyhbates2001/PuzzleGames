import { useEffect, useRef, useState } from 'react'

export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** Below this remaining time, the countdown reads as urgent (see LOW_TIME_MS). */
const LOW_TIME_MS = 10_000

interface TimerProps {
  /** Accumulated time while paused/stopped. */
  elapsedMs: number
  /** Timestamp the current run started at, or null while paused — owns its own 250ms
   *  tick internally so a running timer only re-renders itself, not the whole page. */
  runStartedAt: number | null
  /** Set only for a Timed boss level (see games/chapters.ts) — switches the display to
   *  a countdown from this budget instead of counting up. */
  budgetMs?: number
  /** Fires once when the countdown reaches zero while running. Pass a fresh instance
   *  per level (e.g. keyed off the level id) — this component re-arms on every mount. */
  onExpire?: () => void
}

export function Timer({ elapsedMs, runStartedAt, budgetMs, onExpire }: TimerProps) {
  const [, forceTick] = useState(0)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (runStartedAt === null) return
    const id = setInterval(() => forceTick((t) => t + 1), 250)
    return () => clearInterval(id)
  }, [runStartedAt])

  const displayElapsedMs = runStartedAt !== null ? elapsedMs + (Date.now() - runStartedAt) : elapsedMs
  const remainingMs = budgetMs !== undefined ? Math.max(0, budgetMs - displayElapsedMs) : null

  useEffect(() => {
    if (remainingMs === 0 && runStartedAt !== null && !expiredRef.current) {
      expiredRef.current = true
      onExpire?.()
    }
  }, [remainingMs, runStartedAt, onExpire])

  const low = remainingMs !== null && remainingMs <= LOW_TIME_MS

  return (
    <div
      className={`font-mono text-[28px] font-bold tabular-nums ${low ? 'text-danger' : 'text-ink'}`}
      aria-live="off"
    >
      {formatElapsed(remainingMs ?? displayElapsedMs)}
    </div>
  )
}
