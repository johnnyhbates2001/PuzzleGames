import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Difficulty, ZipLevelRecord } from '../engine/zip/types'
import { createInitialState, zipReducer } from '../state/zipReducer'
import { getZipInProgress, recordZipCompletion, saveZipInProgress } from '../storage/db'
import { getNextZipLevel } from '../games/zipLevels'
import { useAppLifecycle } from '../hooks/useAppLifecycle'
import { ZipBoard } from '../components/ZipBoard'
import { ZipControls } from '../components/ZipControls'
import { Timer } from '../components/Timer'

// Content doesn't matter — this state is replaced by LOAD before the player can
// interact, and (unlike Sudoku) Zip's engine is fully parameterized by level.size, so
// a trivial 1x1 placeholder is safe.
const PLACEHOLDER_LEVEL: ZipLevelRecord = {
  id: 'placeholder',
  difficulty: 'easy',
  size: 1,
  checkpoints: [{ row: 0, col: 0 }],
  walls: [],
  solution: [{ row: 0, col: 0 }],
}

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

interface ReplayLocationState {
  replayLevel?: ZipLevelRecord
}

export default function ZipGamePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null

  const [state, dispatch] = useReducer(zipReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<{ source: 'bank' | 'generated'; bankIndex?: number }>({ source: 'generated' })
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)

  useEffect(() => {
    if (!validDifficulty) return
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      try {
        const replayLevel = initialReplayLevelRef.current
        if (replayLevel) {
          dispatch({ type: 'LOAD', level: replayLevel })
          return
        }

        const inProgress = await getZipInProgress(validDifficulty as Difficulty)
        if (cancelled) return

        if (inProgress) {
          sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
          dispatch({
            type: 'LOAD',
            level: inProgress.level,
            snapshot: { path: inProgress.path, elapsedMs: inProgress.elapsedMs },
          })
        } else {
          const next = await getNextZipLevel(validDifficulty as Difficulty)
          if (cancelled) return
          sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
          dispatch({ type: 'LOAD', level: next.level })
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [validDifficulty])

  useEffect(() => {
    if (!loading && !error && state.status === 'playing') {
      dispatch({ type: 'RESUME', now: Date.now() })
    }
  }, [loading, error])

  useAppLifecycle(
    () => dispatch({ type: 'PAUSE', now: Date.now() }),
    () => {
      if (state.status === 'playing') dispatch({ type: 'RESUME', now: Date.now() })
    },
  )

  useEffect(() => {
    if (loading || !validDifficulty || state.status !== 'playing') return
    saveZipInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      path: state.path,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.path, state.elapsedMs, state.level, state.status, loading, validDifficulty])

  useEffect(() => {
    if (state.status !== 'won' || !validDifficulty) return
    let cancelled = false
    recordZipCompletion(validDifficulty as Difficulty, state.elapsedMs).then((progress) => {
      if (!cancelled) {
        navigate(`/zip/${validDifficulty}/complete`, {
          state: {
            timeMs: state.elapsedMs,
            levelNumber: progress.completedCount,
            level: state.level,
            path: state.path,
          },
          replace: true,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [state.status, validDifficulty, navigate, state.elapsedMs, state.level, state.path])

  const handleCellEnter = useCallback((row: number, col: number) => {
    dispatch({ type: 'ENTER_CELL', row, col, now: Date.now() })
  }, [])

  if (!validDifficulty) {
    return <ErrorScreen message="Unknown difficulty." onBack={() => navigate('/zip')} />
  }
  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/zip')} />
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center gap-6 bg-bg px-4 py-[max(1.5rem,env(safe-area-inset-top))] text-ink">
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/zip')}
          aria-label="Back"
          className="inline-flex size-9 items-center justify-center rounded-full bg-accent-tint text-accent"
        >
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M8 1L1 7.5 8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Timer elapsedMs={state.elapsedMs} runStartedAt={state.runStartedAt} />
        <span className="size-9" aria-hidden="true" />
      </div>

      <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
        {loading ? (
          <p className="text-ink-muted">Loading level…</p>
        ) : (
          <ZipBoard level={state.level} path={state.path} onCellEnter={handleCellEnter} />
        )}

        <ZipControls
          canUndo={state.history.length > 0}
          canClear={state.path.length > 0}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onClear={() => dispatch({ type: 'CLEAR', now: Date.now() })}
        />
      </div>
    </main>
  )
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-bg px-4 text-center text-ink">
      <p>{message}</p>
      <button type="button" onClick={onBack} className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
        Back
      </button>
    </main>
  )
}
