import { useEffect, useState } from 'react'

export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const ss = String(totalSeconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

interface TimerProps {
  /** Accumulated time while paused/stopped. */
  elapsedMs: number
  /** Timestamp the current run started at, or null while paused — owns its own 250ms
   *  tick internally so a running timer only re-renders itself, not the whole page. */
  runStartedAt: number | null
}

export function Timer({ elapsedMs, runStartedAt }: TimerProps) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (runStartedAt === null) return
    const id = setInterval(() => forceTick((t) => t + 1), 250)
    return () => clearInterval(id)
  }, [runStartedAt])

  const displayElapsedMs = runStartedAt !== null ? elapsedMs + (Date.now() - runStartedAt) : elapsedMs

  return (
    <div className="font-mono text-[28px] font-bold tabular-nums text-ink" aria-live="off">
      {formatElapsed(displayElapsedMs)}
    </div>
  )
}
