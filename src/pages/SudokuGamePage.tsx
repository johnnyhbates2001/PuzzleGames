import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { SUDOKU_SIZE, type Difficulty, type SudokuLevelRecord } from '../engine/sudoku/types'
import { getConflicts } from '../engine/sudoku/validator'
import { createInitialState, sudokuReducer } from '../state/sudokuReducer'
import { boardValues } from '../state/sudokuTypes'
import { getSudokuInProgress, recordSudokuCompletion, saveSudokuInProgress } from '../storage/db'
import { getNextSudokuLevel } from '../games/sudokuLevels'
import { useAppLifecycle } from '../hooks/useAppLifecycle'
import { SudokuBoard } from '../components/SudokuBoard'
import { SudokuKeypad } from '../components/SudokuKeypad'
import { SudokuControls } from '../components/SudokuControls'
import { Timer } from '../components/Timer'

// Shape must be a real 9x9 grid — the validator/board components are hardcoded to
// SUDOKU_SIZE (real Sudoku is always 9x9, unlike Queens' per-difficulty size), so an
// undersized placeholder would throw as soon as anything reads past index 0. Content
// doesn't matter: this state is replaced by LOAD before the player can interact.
const BLANK_GRID = Array.from({ length: SUDOKU_SIZE }, () => new Array<number>(SUDOKU_SIZE).fill(0))
const PLACEHOLDER_LEVEL: SudokuLevelRecord = {
  id: 'placeholder',
  difficulty: 'easy',
  puzzle: BLANK_GRID,
  solution: BLANK_GRID,
}

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

interface ReplayLocationState {
  replayLevel?: SudokuLevelRecord
}

export default function SudokuGamePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null

  const [state, dispatch] = useReducer(sudokuReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level))
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

        const inProgress = await getSudokuInProgress(validDifficulty as Difficulty)
        if (cancelled) return

        if (inProgress) {
          sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
          dispatch({
            type: 'LOAD',
            level: inProgress.level,
            snapshot: { board: inProgress.board, elapsedMs: inProgress.elapsedMs },
          })
        } else {
          const next = await getNextSudokuLevel(validDifficulty as Difficulty)
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
    saveSudokuInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      board: state.board,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.board, state.elapsedMs, state.level, state.status, loading, validDifficulty])

  useEffect(() => {
    if (state.status !== 'won' || !validDifficulty) return
    let cancelled = false
    recordSudokuCompletion(validDifficulty as Difficulty, state.elapsedMs).then((progress) => {
      if (!cancelled) {
        navigate(`/sudoku/${validDifficulty}/complete`, {
          state: {
            timeMs: state.elapsedMs,
            levelNumber: progress.completedCount,
            level: state.level,
            board: state.board,
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
    dispatch({ type: 'SELECT_CELL', row, col })
  }, [])

  const handleDigit = useCallback((digit: number) => {
    dispatch({ type: 'INPUT_DIGIT', digit, now: Date.now() })
  }, [])

  const handleErase = useCallback(() => {
    dispatch({ type: 'ERASE', now: Date.now() })
  }, [])

  const handleToggleNoteMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_NOTE_MODE' })
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= '1' && e.key <= '9') {
        dispatch({ type: 'INPUT_DIGIT', digit: Number(e.key), now: Date.now() })
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        dispatch({ type: 'ERASE', now: Date.now() })
      } else if (e.key.toLowerCase() === 'n') {
        dispatch({ type: 'TOGGLE_NOTE_MODE' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const conflicts = useMemo(() => getConflicts(boardValues(state.board)), [state.board])
  const selectedValue = state.selected ? state.board[state.selected.row][state.selected.col].value || null : null

  if (!validDifficulty) {
    return <ErrorScreen message="Unknown difficulty." onBack={() => navigate('/sudoku')} />
  }
  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/sudoku')} />
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center gap-6 bg-bg px-4 py-[max(1.5rem,env(safe-area-inset-top))] text-ink">
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/sudoku')}
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

      <div className="flex w-full max-w-[420px] flex-col items-center gap-4">
        {loading ? (
          <p className="text-ink-muted">Loading level…</p>
        ) : (
          <>
            <SudokuBoard
              board={state.board}
              selected={state.selected}
              conflicts={conflicts}
              onCellClick={handleCellClick}
            />
            <SudokuKeypad
              selectedValue={selectedValue}
              noteMode={state.noteMode}
              onDigit={handleDigit}
              onToggleNoteMode={handleToggleNoteMode}
            />
          </>
        )}

        <SudokuControls
          canErase={state.selected !== null}
          canUndo={state.history.length > 0}
          onErase={handleErase}
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

