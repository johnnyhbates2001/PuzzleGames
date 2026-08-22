import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Difficulty, LevelRecord } from '../engine/types'
import type { CellState } from '../state/types'
import { averageTimeMs, getProgress } from '../storage/db'
import { formatElapsed } from '../components/Timer'
import { Board } from '../components/Board'

interface CompleteLocationState {
  timeMs: number
  levelNumber: number
  level: LevelRecord
  board: CellState[][]
}

const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

export default function CompletePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [avgMs, setAvgMs] = useState<number | null>(null)
  const [bestMs, setBestMs] = useState<number | null>(null)

  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const completion = location.state as CompleteLocationState | null

  useEffect(() => {
    if (!validDifficulty) return
    let cancelled = false
    getProgress(validDifficulty).then((progress) => {
      if (!cancelled) {
        setAvgMs(averageTimeMs(progress))
        setBestMs(progress.bestTimeMs)
      }
    })
    return () => {
      cancelled = true
    }
  }, [validDifficulty])

  if (!validDifficulty || !completion) {
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-bg px-4 text-center text-ink">
        <p>No completion to show.</p>
        <Link to="/queens" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
          Back to difficulties
        </Link>
      </main>
    )
  }

  const { timeMs, levelNumber, level, board } = completion

  return (
    <main className="fixed inset-0 overflow-hidden bg-bg">
      <Board
        level={level}
        board={board}
        conflicts={new Set()}
        onCellClick={() => {}}
        onDragStart={() => {}}
        onCellDragEnter={() => {}}
        className="pointer-events-none absolute inset-x-4 top-[max(1.5rem,env(safe-area-inset-top))] max-w-lg opacity-65 blur-[3px] sm:mx-auto sm:inset-x-0"
      />
      <div className="absolute inset-0 bg-ink/32" />

      <div className="absolute inset-x-4 bottom-0 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-t-[32px] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-card">
        <span className="absolute -top-8 flex size-16 items-center justify-center rounded-full border-4 border-surface bg-accent text-2xl font-bold text-white">
          ✓
        </span>

        <div className="mt-4">
          <h1 className="font-display text-[23px] font-extrabold text-ink">Solved</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {LABELS[validDifficulty]} · Level {levelNumber}
          </p>
        </div>

        <p className="font-mono text-[52px] font-extrabold leading-none tabular-nums text-ink">
          {formatElapsed(timeMs)}
        </p>

        <div className="flex w-full rounded-2xl bg-accent-tint py-3">
          <div className="flex flex-1 flex-col items-center gap-0.5">
            <span className="font-mono text-[15px] font-bold text-accent">
              {bestMs !== null ? formatElapsed(bestMs) : '—'}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Best</span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-0.5">
            <span className="font-mono text-[15px] font-bold text-ink">
              {avgMs !== null ? formatElapsed(avgMs) : '—'}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Average</span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate(`/queens/${validDifficulty}`, { replace: true })}
            className="w-full rounded-full bg-accent py-3 font-semibold text-white"
          >
            Next level
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(`/queens/${validDifficulty}`, { state: { replayLevel: level }, replace: true })}
              className="flex-1 rounded-full bg-bg py-3 font-semibold text-ink-muted"
            >
              Replay
            </button>
            <Link to="/" className="flex-1 rounded-full bg-bg py-3 font-semibold text-ink-muted">
              Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
