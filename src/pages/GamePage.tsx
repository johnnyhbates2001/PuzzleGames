import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Coord, Difficulty, LevelRecord } from '../engine/types'
import { getConflicts } from '../engine/validator'
import { createInitialState, gameReducer } from '../state/gameReducer'
import { getInProgress, getSettings, recordCompletion, saveInProgress, setAutoPlaceX } from '../storage/db'
import { getNextLevel } from '../games/queensLevels'
import { useAppLifecycle } from '../hooks/useAppLifecycle'
import { Board } from '../components/Board'
import { Timer } from '../components/Timer'
import { Controls } from '../components/Controls'

const PLACEHOLDER_LEVEL: LevelRecord = {
  id: 'placeholder',
  difficulty: 'easy',
  size: 1,
  regions: [[0]],
  solution: [{ row: 0, col: 0 }],
}

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

interface ReplayLocationState {
  replayLevel?: LevelRecord
}

export default function GamePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null

  const [state, dispatch] = useReducer(gameReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level, true))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<{ source: 'bank' | 'generated'; bankIndex?: number }>({ source: 'generated' })
  // Captured once at mount — GamePage always remounts fresh on navigation into this
  // route (Complete -> Game is always a route change), so this never needs to react
  // to a later location.state change.
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)

  // Load the in-progress save for this difficulty if one exists, else the next level.
  useEffect(() => {
    if (!validDifficulty) return
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      try {
        const replayLevel = initialReplayLevelRef.current
        if (replayLevel) {
          const settings = await getSettings()
          if (cancelled) return
          sourceRef.current = { source: 'generated' }
          dispatch({ type: 'LOAD', level: replayLevel, autoPlaceX: settings.autoPlaceX })
          return
        }

        const [settings, inProgress] = await Promise.all([getSettings(), getInProgress(validDifficulty as Difficulty)])
        if (cancelled) return

        if (inProgress) {
          sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
          dispatch({
            type: 'LOAD',
            level: inProgress.level,
            autoPlaceX: settings.autoPlaceX,
            snapshot: { board: inProgress.board, elapsedMs: inProgress.elapsedMs },
          })
        } else {
          const next = await getNextLevel(validDifficulty as Difficulty)
          if (cancelled) return
          sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
          dispatch({ type: 'LOAD', level: next.level, autoPlaceX: settings.autoPlaceX })
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

  // LOAD always leaves the timer paused (runStartedAt=null); explicitly resume once mounted.
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

  // Autosave in-progress state so leaving and returning resumes this exact board.
  useEffect(() => {
    if (loading || !validDifficulty || state.status !== 'playing') return
    saveInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      board: state.board,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.board, state.elapsedMs, state.level, state.status, loading, validDifficulty])

  // On win: record completion, then hand off to the completion screen.
  useEffect(() => {
    if (state.status !== 'won' || !validDifficulty) return
    let cancelled = false
    recordCompletion(validDifficulty as Difficulty, state.elapsedMs, state.hintsUsed > 0).then((result) => {
      if (!cancelled) {
        navigate(`/queens/${validDifficulty}/complete`, {
          state: {
            timeMs: state.elapsedMs,
            levelNumber: result.progress.completedCount,
            level: state.level,
            board: state.board,
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
  }, [state.status, validDifficulty, navigate, state.elapsedMs, state.level, state.board])

  const handleCellClick = useCallback((row: number, col: number) => {
    dispatch({ type: 'CELL_CLICK', row, col, now: Date.now() })
  }, [])

  const handleDragStart = useCallback(() => {
    dispatch({ type: 'BEGIN_DRAG_MARK' })
  }, [])

  const handleCellDragEnter = useCallback((row: number, col: number, mode: 'add' | 'erase') => {
    dispatch({ type: 'DRAG_MARK_CELL', row, col, mode })
  }, [])

  const conflicts = useMemo(() => {
    const queens: Coord[] = []
    for (let r = 0; r < state.level.size; r++) {
      for (let c = 0; c < state.level.size; c++) {
        if (state.board[r][c].queen) queens.push({ row: r, col: c })
      }
    }
    return getConflicts(queens, state.level.regions)
  }, [state.board, state.level])

  if (!validDifficulty) {
    return <ErrorScreen message="Unknown difficulty." onBack={() => navigate('/queens')} />
  }
  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/queens')} />
  }

  return (
    <main
      data-game="queens"
      className="mx-auto flex min-h-svh max-w-lg flex-col items-center gap-6 bg-bg px-4 py-[max(1.5rem,env(safe-area-inset-top))] text-ink"
    >
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/queens')}
          aria-label="Back"
          className="inline-flex size-9 items-center justify-center rounded-full bg-accent-tint text-accent"
        >
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M8 1L1 7.5 8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Timer elapsedMs={state.elapsedMs} runStartedAt={state.runStartedAt} />
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            state.autoPlaceX ? 'bg-accent-tint text-accent' : 'text-ink-muted'
          }`}
        >
          Auto X {state.autoPlaceX ? 'on' : 'off'}
        </span>
      </div>

      {/* Board and Controls share this single wrapper's width (rather than each
          declaring their own max-width independently) so widening the board to
          reclaim tap-target pixels can never desync the two. Controls stays
          unconditional (Undo/Clear/Auto-X available even while loading, as
          before) — only the board area itself swaps for the loading message. */}
      <div className="-mx-2 flex w-[calc(100%+1rem)] max-w-[560px] flex-col items-center gap-6">
        {loading ? (
          <p className="text-ink-muted">Loading level…</p>
        ) : (
          <Board
            level={state.level}
            board={state.board}
            conflicts={conflicts}
            onCellClick={handleCellClick}
            onDragStart={handleDragStart}
            onCellDragEnter={handleCellDragEnter}
          />
        )}

        <Controls
          autoPlaceX={state.autoPlaceX}
          canUndo={state.history.length > 0}
          onClear={() => dispatch({ type: 'CLEAR', now: Date.now() })}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onToggleAutoX={(enabled) => {
            dispatch({ type: 'SET_AUTO_X', enabled })
            void setAutoPlaceX(enabled)
          }}
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
