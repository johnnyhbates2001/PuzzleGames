import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import type { Difficulty, PatchesLevelRecord } from '../engine/patches/types'
import { createInitialState, getWrongCells, patchesReducer } from '../state/patchesReducer'
import {
  getDailyChallenge,
  getPatchesInProgress,
  getSettings,
  recordPatchesCompletion,
  savePatchesInProgress,
  spendCoins,
} from '../storage/db'
import { getNextPatchesLevel } from '../games/patchesLevels'
import { getDailyPatchesLevel, todayDateKey } from '../games/dailyChallenge'
import { useGameLifecycle } from '../hooks/useGameLifecycle'
import { useGameCompletion } from '../hooks/useGameCompletion'
import { useAudio } from '../hooks/useAudio'
import { PatchesBoard } from '../components/PatchesBoard'
import { PatchesControls } from '../components/PatchesControls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'

const HINT_OPTIONS: HintOption[] = [
  { id: 'check', icon: '⚑', title: 'Check my work', desc: 'Flags any placed patch with the wrong size.', price: 40 },
  { id: 'reveal-clue', icon: '✧', title: 'Reveal a patch', desc: "Places one clue's correct rectangle.", price: 120 },
]

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
  const isDaily = difficulty === 'daily'
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const { playSound, buzz } = useAudio()

  const [state, dispatch] = useReducer(patchesReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level))
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
          const level = getDailyPatchesLevel(dateKey)
          dispatch({ type: 'LOAD', level })
          return
        }

        const [settings, inProgress] = await Promise.all([getSettings(), getPatchesInProgress(validDifficulty as Difficulty)])
        if (cancelled) return
        setCoins(settings.coins)

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
  }, [validDifficulty, isDaily])

  useGameLifecycle(loading, error, state.status, dispatch)

  // Autosave in-progress state so leaving and returning resumes this exact board.
  // Daily Challenge intentionally skips this (see src/games/dailyChallenge.ts) — it
  // always restarts fresh from the same deterministic puzzle within a day.
  useEffect(() => {
    if (loading || !validDifficulty || isDaily || state.status !== 'playing') return
    savePatchesInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      placed: state.placed,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.placed, state.elapsedMs, state.level, state.status, loading, validDifficulty, isDaily])

  useGameCompletion({
    gameId: 'patches',
    basePath: '/patches',
    status: state.status,
    isDaily,
    validDifficulty,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    level: state.level,
    extraKey: 'placed',
    extraValue: state.placed,
    dailyAlreadyCompletedRef,
    recordCompletion: recordPatchesCompletion,
  })

  const handleStartDrag = useCallback(
    (row: number, col: number) => {
      playSound('tap')
      buzz(10)
      dispatch({ type: 'START_DRAG', row, col })
    },
    [playSound, buzz],
  )

  const handleCommitDrag = useCallback((row: number, col: number) => {
    dispatch({ type: 'COMMIT_DRAG', row, col, now: Date.now() })
  }, [])

  const handleCancelDrag = useCallback(() => {
    dispatch({ type: 'CANCEL_DRAG' })
  }, [])

  const handleRemoveRect = useCallback((row: number, col: number) => {
    dispatch({ type: 'REMOVE_RECT', row, col })
  }, [])

  const handleUseHint = useCallback(
    async (id: string, price: number) => {
      const ok = await spendCoins(price)
      if (!ok) return
      setCoins((c) => c - price)
      playSound('hint')

      if (id === 'check') {
        const wrong = getWrongCells(state)
        setCheckMessage(wrong.size === 0 ? 'Looking good — nothing wrong yet!' : 'A placed patch has the wrong size for its clue.')
        dispatch({ type: 'HINT_CHECK' })
        return
      }

      setCheckMessage(null)
      if (id === 'reveal-clue') dispatch({ type: 'HINT_REVEAL_CLUE', now: Date.now() })
      setHintsOpen(false)
    },
    [state, playSound],
  )

  if (!validDifficulty && !isDaily) {
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
      <GameHeader
        backTo="/patches"
        elapsedMs={state.elapsedMs}
        runStartedAt={state.runStartedAt}
        coins={coins}
        right={
          isDaily ? (
            <span className="rounded-full bg-accent-tint px-3 py-1.5 text-xs font-semibold text-accent">Daily Challenge</span>
          ) : undefined
        }
      />

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
            solved={state.status === 'won'}
          />
        )}

        <PatchesControls
          canUndo={state.placed.length > 0}
          canClear={state.placed.length > 0}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onClear={() => dispatch({ type: 'CLEAR' })}
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
