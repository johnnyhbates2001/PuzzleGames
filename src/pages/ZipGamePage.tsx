import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import type { Coord, Difficulty, ZipLevelRecord } from '../engine/zip/types'
import { applyCellEntry } from '../engine/zip/validator'
import { createInitialState, getWrongCells, zipReducer } from '../state/zipReducer'
import {
  getDailyChallenge,
  getSettings,
  getZipInProgress,
  getZipProgress,
  recordZipCompletion,
  saveZipInProgress,
  spendCoins,
} from '../storage/db'
import { getNextZipLevel } from '../games/zipLevels'
import { getDailyZipLevel, todayDateKey } from '../games/dailyChallenge'
import { endlessProgress, modifierLabel, modifiersForLevel, type LevelModifiers } from '../games/chapters'
import { useGameLifecycle } from '../hooks/useGameLifecycle'
import { useGameCompletion } from '../hooks/useGameCompletion'
import { useAudio } from '../hooks/useAudio'
import { ZipBoard } from '../components/ZipBoard'
import { ZipControls } from '../components/ZipControls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'
import { FailSheet } from '../components/FailSheet'

const HINT_OPTIONS: HintOption[] = [
  { id: 'reveal-next', icon: '👁', title: 'Reveal next step', desc: 'Extends your path by one correct cell.', price: 25 },
  { id: 'check', icon: '⚑', title: 'Check my work', desc: 'Flags any step that strayed from the path.', price: 40 },
]

// First-guess placeholder, not derived from real solve-time data — tune once the user
// has actually played a few Timed boss levels.
const TIMED_BUDGET_MS = 60_000

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
  const isDaily = difficulty === 'daily'
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const { playSound, buzz } = useAudio()

  const [state, dispatch] = useReducer(zipReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [hintsOpen, setHintsOpen] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const [rejectedCell, setRejectedCell] = useState<Coord | null>(null)
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
          const [settings, existing] = await Promise.all([getSettings(), getDailyChallenge(dateKey, 'zip')])
          if (cancelled) return
          setCoins(settings.coins)
          dailyAlreadyCompletedRef.current = !!existing
          const level = getDailyZipLevel(dateKey)
          dispatch({ type: 'LOAD', level })
          return
        }

        const [settings, inProgress, progress] = await Promise.all([
          getSettings(),
          getZipInProgress(validDifficulty as Difficulty),
          getZipProgress(validDifficulty as Difficulty),
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
  }, [validDifficulty, isDaily])

  useGameLifecycle(loading, error, state.status, dispatch)

  // Autosave in-progress state so leaving and returning resumes this exact board.
  // Daily Challenge intentionally skips this (see src/games/dailyChallenge.ts) — it
  // always restarts fresh from the same deterministic puzzle within a day.
  useEffect(() => {
    if (loading || !validDifficulty || isDaily || state.status !== 'playing') return
    saveZipInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      path: state.path,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.path, state.elapsedMs, state.level, state.status, loading, validDifficulty, isDaily])

  useGameCompletion({
    gameId: 'zip',
    basePath: '/zip',
    status: state.status,
    isDaily,
    validDifficulty,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    level: state.level,
    extraKey: 'path',
    extraValue: state.path,
    dailyAlreadyCompletedRef,
    recordCompletion: recordZipCompletion,
  })

  // Perfect Run: fails the instant a wrong step appears, using the same non-mutating
  // check the paid "check" hint already uses — just watched continuously instead of
  // on demand, and only while the modifier is actually active.
  useEffect(() => {
    if (!modifiers?.perfectRun || failed || state.status !== 'playing') return
    if (getWrongCells(state).size > 0) {
      dispatch({ type: 'PAUSE', now: Date.now() })
      setFailed({ reason: 'mistake' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.path, modifiers, failed, state.status])

  const handleTryAgain = useCallback(async () => {
    if (!validDifficulty) return
    setFailed(null)
    setLoading(true)
    try {
      const next = await getNextZipLevel(validDifficulty)
      sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
      dispatch({ type: 'LOAD', level: next.level })
    } finally {
      setLoading(false)
    }
  }, [validDifficulty])

  const handleCellEnter = useCallback(
    (row: number, col: number) => {
      // Classify the move client-side first (using the same pure function the
      // reducer itself uses) purely to drive a shake on illegal attempts — an
      // unchanged path means the reducer would no-op too, so skip the dispatch.
      if (applyCellEntry(state.path, state.level, { row, col }) === state.path) {
        setRejectedCell({ row, col })
        return
      }
      playSound('tap')
      buzz(10)
      dispatch({ type: 'ENTER_CELL', row, col, now: Date.now() })
    },
    [state.path, state.level, playSound, buzz],
  )

  const handleUseHint = useCallback(
    async (id: string, price: number) => {
      const ok = await spendCoins(price)
      if (!ok) return
      setCoins((c) => c - price)
      playSound('hint')

      if (id === 'check') {
        const wrong = getWrongCells(state)
        setCheckMessage(wrong.size === 0 ? 'Looking good — nothing wrong yet!' : `${wrong.size} step${wrong.size === 1 ? '' : 's'} strayed from the path.`)
        dispatch({ type: 'HINT_CHECK' })
        return
      }

      setCheckMessage(null)
      if (id === 'reveal-next') dispatch({ type: 'HINT_REVEAL_NEXT', now: Date.now() })
      setHintsOpen(false)
    },
    [state, playSound],
  )

  if (!validDifficulty && !isDaily) {
    return <ErrorScreen message="Unknown difficulty." onBack={() => navigate('/zip')} />
  }
  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/zip')} />
  }

  return (
    <main
      data-game="zip"
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
          <ZipBoard
            level={state.level}
            path={state.path}
            onCellEnter={handleCellEnter}
            rejectedCell={rejectedCell}
            onRejectedShakeEnd={() => setRejectedCell(null)}
            solved={state.status === 'won'}
          />
        )}

        <ZipControls
          canUndo={!modifiers?.noUndo && state.history.length > 0}
          canClear={state.path.length > 0}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onClear={() => dispatch({ type: 'CLEAR', now: Date.now() })}
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
