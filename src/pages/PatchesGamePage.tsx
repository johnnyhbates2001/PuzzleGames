import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Difficulty, PatchesLevelRecord } from '../engine/patches/types'
import { createInitialState, patchesReducer } from '../state/patchesReducer'
import { getPatchesInProgress, recordPatchesCompletion, savePatchesInProgress } from '../storage/db'
import { getNextPatchesLevel } from '../games/patchesLevels'
import { useAppLifecycle } from '../hooks/useAppLifecycle'
import { PatchesBoard } from '../components/PatchesBoard'
import { PatchesControls } from '../components/PatchesControls'
import { Timer } from '../components/Timer'

// Content doesn't matter — this state is replaced by LOAD before the player can
// interact, and (like Zip) Patches' engine is fully parameterized by level.size, so a
// trivial 1x1 placeholder is safe.
const PLACEHOLDER_LEVEL: PatchesLevelRecord = {
  id: 'placeholder',
  difficulty: 'easy',
  size: 1,
  clues: [{ cell: { row: 0, col: 0 }, area: 1, shape: 'square' }],
  solution: [{ row: 0, col: 0, width: 1, height: 1 }],
}

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

interface ReplayLocationState {
  replayLevel?: PatchesLevelRecord
}

export default function PatchesGamePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null

  const [state, dispatch] = useReducer(patchesReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level))
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

        const inProgress = await getPatchesInProgress(validDifficulty as Difficulty)
        if (cancelled) return

        if (inProgress) {
          sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
          dispatch({
            type: 'LOAD',
            level: inProgress.level,
            snapshot: { placed: inProgress.placed, elapsedMs: inProgress.elapsedMs },
          })
        } else {
          const next = await getNextPatchesLevel(validDifficulty as Difficulty)
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
    savePatchesInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      placed: state.placed,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.placed, state.elapsedMs, state.level, state.status, loading, validDifficulty])

  useEffect(() => {
    if (state.status !== 'won' || !validDifficulty) return
    let cancelled = false
    recordPatchesCompletion(validDifficulty as Difficulty, state.elapsedMs, state.hintsUsed > 0).then((result) => {
      if (!cancelled) {
        navigate(`/patches/${validDifficulty}/complete`, {
          state: {
            timeMs: state.elapsedMs,
            levelNumber: result.progress.completedCount,
            level: state.level,
            placed: state.placed,
            coinsAwarded: result.coinsAwarded,
            isPersonalBest: result.isPersonalBest,
          },
          replace: true,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [state.status, validDifficulty, navigate, state.elapsedMs, state.level, state.placed])

  const handleStartDrag = useCallback((row: number, col: number) => {
    dispatch({ type: 'START_DRAG', row, col })
  }, [])

  const handleCommitDrag = useCallback((row: number, col: number) => {
    dispatch({ type: 'COMMIT_DRAG', row, col, now: Date.now() })
  }, [])

  const handleCancelDrag = useCallback(() => {
    dispatch({ type: 'CANCEL_DRAG' })
  }, [])

  const handleRemoveRect = useCallback((row: number, col: number) => {
    dispatch({ type: 'REMOVE_RECT', row, col })
  }, [])

  if (!validDifficulty) {
    return <ErrorScreen message="Unknown difficulty." onBack={() => navigate('/patches')} />
  }
  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/patches')} />
  }

  return (
    <main
      data-game="patches"
      className="mx-auto flex min-h-svh max-w-lg flex-col items-center gap-6 bg-bg px-4 py-[max(1.5rem,env(safe-area-inset-top))] text-ink"
    >
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/patches')}
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
          <PatchesBoard
            level={state.level}
            placed={state.placed}
            onStartDrag={handleStartDrag}
            onCommitDrag={handleCommitDrag}
            onCancelDrag={handleCancelDrag}
            onRemoveRect={handleRemoveRect}
          />
        )}

        <PatchesControls
          canUndo={state.placed.length > 0}
          canClear={state.placed.length > 0}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onClear={() => dispatch({ type: 'CLEAR' })}
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
