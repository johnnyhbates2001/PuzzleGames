import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import type { Coord, Difficulty, LevelRecord } from '../engine/types'
import { getConflicts } from '../engine/validator'
import { createInitialState, gameReducer, getWrongQueens } from '../state/gameReducer'
import {
  getDailyChallenge,
  getInProgress,
  getSettings,
  recordCompletion,
  saveInProgress,
  setAutoPlaceX,
  spendCoins,
} from '../storage/db'
import { getNextLevel } from '../games/queensLevels'
import { getDailyQueensLevel, todayDateKey } from '../games/dailyChallenge'
import { useGameLifecycle } from '../hooks/useGameLifecycle'
import { useGameCompletion } from '../hooks/useGameCompletion'
import { useAudio } from '../hooks/useAudio'
import { Board } from '../components/Board'
import { Controls } from '../components/Controls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'

const HINT_OPTIONS: HintOption[] = [
  { id: 'reveal-cell', icon: '👁', title: 'Reveal a cell', desc: 'Fills one correct square of your choice.', price: 25 },
  { id: 'check', icon: '⚑', title: 'Check my work', desc: 'Flags anything currently placed wrong.', price: 40 },
  { id: 'solve-region', icon: '✧', title: 'Solve a region', desc: 'Completes one whole colored region.', price: 120 },
]

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
  const isDaily = difficulty === 'daily'
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const { playSound, buzz } = useAudio()

  const [state, dispatch] = useReducer(gameReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level, true))
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
  // Captured once at mount — GamePage always remounts fresh on navigation into this
  // route (Complete -> Game is always a route change), so this never needs to react
  // to a later location.state change.
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)

  // Load the in-progress save for this difficulty if one exists, else the next level.
  // The 'daily' route (/queens/daily) shares this same param slot: it skips bank/resume
  // entirely and always loads today's deterministic puzzle (or replays it, via the same
  // replayLevel mechanism used for post-completion replays, if today's is already solved).
  useEffect(() => {
    if (!validDifficulty && !isDaily) return
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      try {
        const replayLevel = initialReplayLevelRef.current
        if (replayLevel) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'generated' }
          dispatch({ type: 'LOAD', level: replayLevel, autoPlaceX: settings.autoPlaceX })
          return
        }

        if (isDaily) {
          const dateKey = todayDateKey()
          const [settings, existing] = await Promise.all([getSettings(), getDailyChallenge(dateKey)])
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'generated' }
          dailyAlreadyCompletedRef.current = !!existing
          const level = getDailyQueensLevel(dateKey)
          dispatch({ type: 'LOAD', level, autoPlaceX: settings.autoPlaceX })
          return
        }

        const [settings, inProgress] = await Promise.all([getSettings(), getInProgress(validDifficulty as Difficulty)])
        if (cancelled) return
        setCoins(settings.coins)

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
  }, [validDifficulty, isDaily])

  useGameLifecycle(loading, error, state.status, dispatch)

  // Autosave in-progress state so leaving and returning resumes this exact board.
  // Daily Challenge intentionally skips this (see src/games/dailyChallenge.ts) — it
  // always restarts fresh from the same deterministic puzzle within a day.
  useEffect(() => {
    if (loading || !validDifficulty || isDaily || state.status !== 'playing') return
    saveInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      board: state.board,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.board, state.elapsedMs, state.level, state.status, loading, validDifficulty, isDaily])

  useGameCompletion({
    gameId: 'queens',
    basePath: '/queens',
    status: state.status,
    isDaily,
    validDifficulty,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    level: state.level,
    extraKey: 'board',
    extraValue: state.board,
    dailyAlreadyCompletedRef,
    recordCompletion,
  })

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
    dispatch({ type: 'DRAG_MARK_CELL', row, col, mode })
  }, [])

  const handleUseHint = useCallback(
    async (id: string, price: number) => {
      const ok = await spendCoins(price)
      if (!ok) return
      setCoins((c) => c - price)
      playSound('hint')

      if (id === 'check') {
        const wrong = getWrongQueens(state)
        setCheckMessage(wrong.size === 0 ? 'Looking good — nothing wrong yet!' : `${wrong.size} queen${wrong.size === 1 ? '' : 's'} placed wrong.`)
        dispatch({ type: 'HINT_CHECK' })
        return
      }

      setCheckMessage(null)
      if (id === 'reveal-cell') dispatch({ type: 'HINT_REVEAL_CELL', now: Date.now() })
      else if (id === 'solve-region') dispatch({ type: 'HINT_SOLVE_REGION', now: Date.now() })
      setHintsOpen(false)
    },
    [state, playSound],
  )

  const conflicts = useMemo(() => {
    const queens: Coord[] = []
    for (let r = 0; r < state.level.size; r++) {
      for (let c = 0; c < state.level.size; c++) {
        if (state.board[r][c].queen) queens.push({ row: r, col: c })
      }
    }
    return getConflicts(queens, state.level.regions)
  }, [state.board, state.level])

  if (!validDifficulty && !isDaily) {
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
      <GameHeader
        backTo="/queens"
        elapsedMs={state.elapsedMs}
        runStartedAt={state.runStartedAt}
        coins={coins}
        right={
          isDaily ? (
            <span className="rounded-full bg-accent-tint px-3 py-1.5 text-xs font-semibold text-accent">Daily Challenge</span>
          ) : (
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                state.autoPlaceX ? 'bg-accent-tint text-accent' : 'text-ink-muted'
              }`}
            >
              Auto X {state.autoPlaceX ? 'on' : 'off'}
            </span>
          )
        }
      />

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
            solved={state.status === 'won'}
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
