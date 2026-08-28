import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import type { Difficulty, NonogramLevelRecord } from '../engine/nonogram/types'
import { createInitialState, getWrongCells, nonogramReducer } from '../state/nonogramReducer'
import {
  getDailyChallenge,
  getNonogramInProgress,
  getNonogramProgress,
  getSettings,
  recordNonogramCompletion,
  saveNonogramInProgress,
  spendCoins,
} from '../storage/db'
import { getNextNonogramLevel } from '../games/nonogramLevels'
import { getDailyNonogramLevel, todayDateKey } from '../games/dailyChallenge'
import { endlessProgress, modifierLabel, modifiersForLevel, type LevelModifiers } from '../games/chapters'
import { useGameLifecycle } from '../hooks/useGameLifecycle'
import { useGameCompletion } from '../hooks/useGameCompletion'
import { useAudio } from '../hooks/useAudio'
import { NonogramBoard } from '../components/NonogramBoard'
import { NonogramControls } from '../components/NonogramControls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'
import { FailSheet } from '../components/FailSheet'

const HINT_OPTIONS: HintOption[] = [
  { id: 'reveal-cell', icon: '👁', title: 'Reveal a cell', desc: 'Fills or X-marks one correct square.', price: 25 },
  { id: 'check', icon: '⚑', title: 'Check my work', desc: 'Flags anything currently marked wrong.', price: 40 },
  { id: 'reveal-line', icon: '✧', title: 'Reveal a line', desc: 'Completes one whole row or column.', price: 120 },
]

// First-guess placeholder, not derived from real solve-time data — tune once the user
// has actually played a few Timed boss levels.
const TIMED_BUDGET_MS = 90_000

// Content doesn't matter — this state is replaced by LOAD before the player can
// interact, and (like Zip/Patches) Nonogram's engine is fully parameterized by
// level.size, so a trivial 1x1 placeholder is safe.
const PLACEHOLDER_LEVEL: NonogramLevelRecord = {
  id: 'placeholder',
  difficulty: 'easy',
  size: 1,
  solution: [[false]],
  rowClues: [[0]],
  colClues: [[0]],
}

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

interface ReplayLocationState {
  replayLevel?: NonogramLevelRecord
}

export default function NonogramGamePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isDaily = difficulty === 'daily'
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const { playSound, buzz } = useAudio()

  const [state, dispatch] = useReducer(nonogramReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [hintsOpen, setHintsOpen] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const [modifiers, setModifiers] = useState<LevelModifiers | null>(null)
  const [failed, setFailed] = useState<{ reason: 'timeout' | 'mistake' } | null>(null)
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
      setModifiers(null)
      setFailed(null)
      try {
        const replayLevel = initialReplayLevelRef.current
        if (replayLevel) {
          getSettings().then((s) => !cancelled && setCoins(s.coins))
          dispatch({ type: 'LOAD', level: replayLevel })
          return
        }

        if (isDaily) {
          const dateKey = todayDateKey()
          const [settings, existing] = await Promise.all([getSettings(), getDailyChallenge(dateKey, 'nonogram')])
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'generated' }
          dailyAlreadyCompletedRef.current = !!existing
          const level = getDailyNonogramLevel(dateKey)
          dispatch({ type: 'LOAD', level })
          return
        }

        const [settings, inProgress, progress] = await Promise.all([
          getSettings(),
          getNonogramInProgress(validDifficulty as Difficulty),
          getNonogramProgress(validDifficulty as Difficulty),
        ])
        if (cancelled) return
        setCoins(settings.coins)
        if (validDifficulty === 'hard') {
          setModifiers(modifiersForLevel(endlessProgress(progress.currentLevelIndex)))
        }

        if (inProgress) {
          sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
          dispatch({
            type: 'LOAD',
            level: inProgress.level,
            snapshot: { grid: inProgress.grid, elapsedMs: inProgress.elapsedMs },
          })
        } else {
          const next = await getNextNonogramLevel(validDifficulty as Difficulty)
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

  useGameLifecycle(loading, error, state.status, dispatch)

  // Autosave in-progress state so leaving and returning resumes this exact board.
  // Daily Challenge intentionally skips this (see src/games/dailyChallenge.ts) — it
  // always restarts fresh from the same deterministic puzzle within a day.
  useEffect(() => {
    if (loading || !validDifficulty || isDaily || state.status !== 'playing') return
    saveNonogramInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      grid: state.grid,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.grid, state.elapsedMs, state.level, state.status, loading, validDifficulty, isDaily])

  useGameCompletion({
    gameId: 'nonogram',
    basePath: '/nonogram',
    status: state.status,
    isDaily,
    validDifficulty,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    level: state.level,
    extraKey: 'grid',
    extraValue: state.grid,
    dailyAlreadyCompletedRef,
    recordCompletion: recordNonogramCompletion,
  })

  // Perfect Run: fails the instant a wrong mark appears, using the same non-mutating
  // check the paid "check" hint already uses — just watched continuously instead of
  // on demand, and only while the modifier is actually active.
  useEffect(() => {
    if (!modifiers?.perfectRun || failed || state.status !== 'playing') return
    if (getWrongCells(state).size > 0) {
      dispatch({ type: 'PAUSE', now: Date.now() })
      setFailed({ reason: 'mistake' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.grid, modifiers, failed, state.status])

  const handleTryAgain = useCallback(async () => {
    if (!validDifficulty) return
    setFailed(null)
    setLoading(true)
    try {
      const next = await getNextNonogramLevel(validDifficulty)
      sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
      dispatch({ type: 'LOAD', level: next.level })
    } finally {
      setLoading(false)
    }
  }, [validDifficulty])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      playSound('tap')
      buzz(10)
      dispatch({ type: 'CELL_CLICK', row, col, now: Date.now() })
    },
    [playSound, buzz],
  )

  const handleDragStart = useCallback(() => {
    playSound('tap')
    buzz(10)
    dispatch({ type: 'BEGIN_DRAG_MARK' })
  }, [playSound, buzz])

  const handleCellDragEnter = useCallback((row: number, col: number, mode: 'add' | 'erase') => {
    dispatch({ type: 'DRAG_MARK_CELL', row, col, mode, now: Date.now() })
  }, [])

  const handleToggleMarkMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_MARK_MODE' })
  }, [])

  const handleUseHint = useCallback(
    async (id: string, price: number) => {
      const ok = await spendCoins(price)
      if (!ok) return
      setCoins((c) => c - price)
      playSound('hint')

      if (id === 'check') {
        const wrong = getWrongCells(state)
        setCheckMessage(wrong.size === 0 ? 'Looking good — nothing wrong yet!' : `${wrong.size} cell${wrong.size === 1 ? '' : 's'} marked wrong.`)
        dispatch({ type: 'HINT_CHECK' })
        return
      }

      setCheckMessage(null)
      if (id === 'reveal-cell') dispatch({ type: 'HINT_REVEAL_CELL', now: Date.now() })
      else if (id === 'reveal-line') dispatch({ type: 'HINT_REVEAL_LINE', now: Date.now() })
      setHintsOpen(false)
    },
    [state, playSound],
  )

  if (!validDifficulty && !isDaily) {
    return <ErrorScreen message="Unknown difficulty." onBack={() => navigate('/nonogram')} />
  }
  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/nonogram')} />
  }

  return (
    <main
      data-game="nonogram"
      className="mx-auto flex min-h-svh max-w-lg flex-col items-center gap-6 bg-bg px-4 py-[max(1.5rem,env(safe-area-inset-top))] text-ink"
    >
      <GameHeader
        elapsedMs={state.elapsedMs}
        runStartedAt={state.runStartedAt}
        coins={coins}
        timerKey={state.level.id}
        budgetMs={modifiers?.timed ? TIMED_BUDGET_MS : undefined}
        onTimerExpire={() => {
          dispatch({ type: 'PAUSE', now: Date.now() })
          setFailed({ reason: 'timeout' })
        }}
        right={
          isDaily ? (
            <span className="rounded-full bg-accent-tint px-3 py-1.5 text-xs font-semibold text-accent">Daily Challenge</span>
          ) : undefined
        }
      />

      <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
        {modifiers && (
          <p className="w-full rounded-2xl bg-accent-tint px-4 py-2.5 text-center text-[13px] font-bold text-accent">
            ⚡ Boss level · {modifierLabel(modifiers)}
          </p>
        )}

        {loading ? (
          <p className="text-ink-muted">Loading level…</p>
        ) : (
          <NonogramBoard
            level={state.level}
            grid={state.grid}
            markMode={state.markMode}
            onCellClick={handleCellClick}
            onDragStart={handleDragStart}
            onCellDragEnter={handleCellDragEnter}
            solved={state.status === 'won'}
          />
        )}

        <NonogramControls
          canUndo={!modifiers?.noUndo && state.history.length > 0}
          canClear={state.grid.some((row) => row.some((mark) => mark !== 'empty'))}
          markMode={state.markMode}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onClear={() => dispatch({ type: 'CLEAR', now: Date.now() })}
          onToggleMarkMode={handleToggleMarkMode}
          onOpenHints={() => {
            setCheckMessage(null)
            setHintsOpen(true)
          }}
          hintPrice={HINT_OPTIONS[0].price}
          hintsDisabled={modifiers?.noHints}
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

      {failed && <FailSheet reason={failed.reason} onTryAgain={handleTryAgain} />}
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
