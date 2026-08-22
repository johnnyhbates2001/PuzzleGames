import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DIFFICULTY_SIZE, type Difficulty } from '../engine/types'
import { averageTimeMs, getProgress, type DifficultyProgress } from '../storage/db'
import { formatElapsed } from '../components/Timer'
import { GridPreview } from '../components/GridPreview'
import { REGION_COLORS } from '../components/Cell'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const DOT_CLASS: Record<Difficulty, string> = {
  easy: 'bg-diff-easy',
  medium: 'bg-diff-medium',
  hard: 'bg-diff-hard',
}
// Decorative preview only — a fixed, offset slice per difficulty so the three rows
// don't all show the identical thumbnail, not derived from real level data (that
// would need an extra getNextLevel call with real bank-pointer side effects).
const PREVIEW_OFFSET: Record<Difficulty, number> = { easy: 0, medium: 3, hard: 6 }

export default function DifficultyPage() {
  const [progress, setProgress] = useState<Partial<Record<Difficulty, DifficultyProgress>>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all(DIFFICULTIES.map((d) => getProgress(d))).then((results) => {
      if (cancelled) return
      const map: Partial<Record<Difficulty, DifficultyProgress>> = {}
      DIFFICULTIES.forEach((d, i) => {
        map[d] = results[i]
      })
      setProgress(map)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] text-ink">
      <Link
        to="/"
        className="inline-flex size-9 items-center justify-center rounded-full bg-accent-tint text-accent"
        aria-label="Home"
      >
        <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
          <path d="M8 1L1 7.5 8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <h1 className="font-display text-[28px] font-extrabold">Queens</h1>
      <div className="flex flex-col gap-3">
        {DIFFICULTIES.map((d) => {
          const p = progress[d]
          const avg = p ? averageTimeMs(p) : null
          return (
            <Link
              key={d}
              to={`/queens/${d}`}
              className="flex items-center gap-4 rounded-[20px] bg-surface p-4 shadow-card transition hover:shadow-md"
            >
              <div className="size-[52px] shrink-0 overflow-hidden rounded-xl">
                <GridPreview
                  colors={[
                    ...REGION_COLORS.slice(PREVIEW_OFFSET[d]),
                    ...REGION_COLORS.slice(0, PREVIEW_OFFSET[d]),
                  ]}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`size-2 shrink-0 rounded-full ${DOT_CLASS[d]}`} />
                  <h2 className="text-[17px] font-bold">{LABELS[d]}</h2>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-muted">
                  {DIFFICULTY_SIZE[d]}×{DIFFICULTY_SIZE[d]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-ink-muted">{p ? p.completedCount : 0} done</p>
                <p className="mt-0.5 font-mono text-[13px] tabular-nums text-ink-muted dark:text-accent">
                  {avg !== null && avg !== undefined ? `avg ${formatElapsed(avg)}` : 'avg —'}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
