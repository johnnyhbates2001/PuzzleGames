import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { SUDOKU_SIZE, type Difficulty, type SudokuLevelRecord } from '../engine/sudoku/types'
import { getConflicts } from '../engine/sudoku/validator'
import { createInitialState, getWrongCells, sudokuReducer } from '../state/sudokuReducer'
import { boardValues } from '../state/sudokuTypes'
import {
  getDailyChallenge,
  getDailyStreak,
  getSettings,
  getSudokuInProgress,
  recordDailyChallengeCompletion,
  recordSudokuCompletion,
  saveSudokuInProgress,
  spendCoins,
} from '../storage/db'
import { getNextSudokuLevel } from '../games/sudokuLevels'
import { getDailySudokuLevel, todayDateKey } from '../games/dailyChallenge'
import { useAppLifecycle } from '../hooks/useAppLifecycle'
import { useAudio } from '../hooks/useAudio'
import { SudokuBoard } from '../components/SudokuBoard'
import { SudokuKeypad } from '../components/SudokuKeypad'
import { SudokuControls } from '../components/SudokuControls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'

const HINT_OPTIONS: HintOption[] = [
  { id: 'reveal-cell', icon: '👁', title: 'Reveal a cell', desc: 'Fills one correct square of your choice.', price: 25 },
  { id: 'check', icon: '⚑', title: 'Check my work', desc: 'Flags anything currently placed wrong.', price: 40 },
  { id: 'solve-box', icon: '✧', title: 'Solve a box', desc: 'Completes one whole 3×3 box.', price: 120 },
]

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
  const isDaily = difficulty === 'daily'
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const { playSound, buzz } = useAudio()

  const [state, dispatch] = useReducer(sudokuReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [hintsOpen, setHintsOpen] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const sourceRef = useRef<{ source: 'bank' | 'generated'; bankIndex?: number }>({ source: 'generated' })
  // Set during load if today's Daily Challenge was already completed — the win effect
  // reads this to skip re-awarding coins on a replay (recordDailyChallengeCompletion
  // would otherwise let a player farm coins by re-solving the same puzzle all day).
  const dailyAlreadyCompletedRef = useRef(false)
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)

  useEffect(() => {
    if (!validDifficulty && !isDaily) return
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      try {
        const replayLevel = initialReplayLevelRef.current
        if (replayLevel) {
          getSettings().then((s) => !cancelled && setCoins(s.coins))
          dispatch({ type: 'LOAD', level: replayLevel })
          return
        }

        if (isDaily) {
          const dateKey = todayDateKey()
          const [settings, existing] = await Promise.all([getSettings(), getDailyChallenge(dateKey)])
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'generated' }
          dailyAlreadyCompletedRef.current = !!existing
          const level = getDailySudokuLevel(dateKey)
          dispatch({ type: 'LOAD', level })
          return
        }

        const [settings, inProgress] = await Promise.all([getSettings(), getSudokuInProgress(validDifficulty as Difficulty)])
        if (cancelled) return
        setCoins(settings.coins)

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
  }, [validDifficulty, isDaily])

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
  // Daily Challenge intentionally skips this (see src/games/dailyChallenge.ts) — it
  // always restarts fresh from the same deterministic puzzle within a day.
  useEffect(() => {
    if (loading || !validDifficulty || isDaily || state.status !== 'playing') return
    saveSudokuInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      board: state.board,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.board, state.elapsedMs, state.level, state.status, loading, validDifficulty, isDaily])

  // On win: record completion, then hand off to the completion screen.
  useEffect(() => {
    if (state.status !== 'won' || (!validDifficulty && !isDaily)) return
    let cancelled = false
    playSound('success')
    buzz([20, 40, 20, 40, 60])

    if (isDaily) {
      const finish = dailyAlreadyCompletedRef.current
        ? getDailyStreak().then((streak) => ({ coinsAwarded: 0, streak }))
        : recordDailyChallengeCompletion('sudoku', state.elapsedMs, state.hintsUsed > 0)
      finish.then((result) => {
        if (!cancelled) {
          navigate('/sudoku/daily/complete', {
            state: {
              timeMs: state.elapsedMs,
              level: state.level,
              board: state.board,
              coinsAwarded: result.coinsAwarded,
              dailyStreak: result.streak,
            },
            replace: true,
          })
        }
      })
    } else {
      recordSudokuCompletion(validDifficulty as Difficulty, state.elapsedMs, state.hintsUsed > 0).then((result) => {
        if (!cancelled) {
          navigate(`/sudoku/${validDifficulty}/complete`, {
            state: {
              timeMs: state.elapsedMs,
              levelNumber: result.progress.completedCount,
              level: state.level,
              board: state.board,
              coinsAwarded: result.coinsAwarded,
              isPersonalBest: result.isPersonalBest,
              dailyBonusApplied: result.dailyBonusApplied,
            },
            replace: true,
          })
        }
      })
    }
    return () => {
      cancelled = true
    }
  }, [state.status, validDifficulty, isDaily, navigate, state.elapsedMs, state.level, state.board])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      playSound('tap')
      buzz(10)
      dispatch({ type: 'SELECT_CELL', row, col })
    },
    [playSound, buzz],
  )

  const handleDigit = useCallback(
    (digit: number) => {
      playSound('tap')
      buzz(10)
      dispatch({ type: 'INPUT_DIGIT', digit, now: Date.now() })
    },
    [playSound, buzz],
  )

  const handleErase = useCallback(() => {
    dispatch({ type: 'ERASE', now: Date.now() })
  }, [])

  const handleToggleNoteMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_NOTE_MODE' })
  }, [])

  const handleUseHint = useCallback(
    async (id: string, price: number) => {
      const ok = await spendCoins(price)
      if (!ok) return
      setCoins((c) => c - price)
      playSound('hint')

      if (id === 'check') {
        const wrong = getWrongCells(state)
        setCheckMessage(wrong.size === 0 ? 'Looking good — nothing wrong yet!' : `${wrong.size} cell${wrong.size === 1 ? '' : 's'} filled wrong.`)
        dispatch({ type: 'HINT_CHECK' })
        return
      }

      setCheckMessage(null)
      if (id === 'reveal-cell') dispatch({ type: 'HINT_REVEAL_CELL', now: Date.now() })
      else if (id === 'solve-box') dispatch({ type: 'HINT_SOLVE_BOX', now: Date.now() })
      setHintsOpen(false)
    },
    [state, playSound],
  )

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

  if (!validDifficulty && !isDaily) {
    return <ErrorScreen message="Unknown difficulty." onBack={() => navigate('/sudoku')} />
  }
  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/sudoku')} />
  }

  return (
    <main
      data-game="sudoku"
      className="mx-auto flex min-h-svh max-w-lg flex-col items-center gap-6 bg-bg px-4 py-[max(1.5rem,env(safe-area-inset-top))] text-ink"
    >
      <GameHeader
        backTo="/sudoku"
        elapsedMs={state.elapsedMs}
        runStartedAt={state.runStartedAt}
        coins={coins}
        right={
          isDaily ? (
            <span className="rounded-full bg-accent-tint px-3 py-1.5 text-xs font-semibold text-accent">Daily Challenge</span>
          ) : undefined
        }
      />

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
          onOpenHints={() => {
            setCheckMessage(null)
            setHintsOpen(true)
          }}
          hintPrice={HINT_OPTIONS[0].price}
        />
      </div>

      <HintSheet
        open={hintsOpen}
        onClose={() => setHintsOpen(false)}
        options={HINT_OPTIONS}
        coins={coins}
        onUseHint={handleUseHint}
        checkMessage={checkMessage}
      />
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

