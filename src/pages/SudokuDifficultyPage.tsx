import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Difficulty } from '../engine/sudoku/types'
import { averageTimeMs, getSudokuProgress, type DifficultyProgress } from '../storage/db'
import { formatElapsed } from '../components/Timer'
import { SudokuGridPreview } from '../components/SudokuGridPreview'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const DOT_CLASS: Record<Difficulty, string> = {
  easy: 'bg-diff-easy',
  medium: 'bg-diff-medium',
  hard: 'bg-diff-hard',
}

export default function SudokuDifficultyPage() {
  const [progress, setProgress] = useState<Partial<Record<Difficulty, DifficultyProgress>>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all(DIFFICULTIES.map((d) => getSudokuProgress(d))).then((results) => {
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
      <h1 className="font-display text-[28px] font-extrabold">Sudoku</h1>
      <div className="flex flex-col gap-3">
        {DIFFICULTIES.map((d) => {
          const p = progress[d]
          const avg = p ? averageTimeMs(p) : null
          return (
            <Link
              key={d}
              to={`/sudoku/${d}`}
              className="flex items-center gap-4 rounded-[20px] bg-surface p-4 shadow-card transition hover:shadow-md"
            >
              <div className="size-[52px] shrink-0 overflow-hidden rounded-xl bg-bg p-1.5">
                <SudokuGridPreview />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`size-2 shrink-0 rounded-full ${DOT_CLASS[d]}`} />
                  <h2 className="text-[17px] font-bold">{LABELS[d]}</h2>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-muted">9×9</p>
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
