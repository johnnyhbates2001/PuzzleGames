import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import type { Coord, Difficulty, LevelRecord } from '../engine/types'
import { coordKey } from '../engine/types'
import { getConflicts } from '../engine/validator'
import type { CellState } from '../state/types'
import { createInitialState, gameReducer, getWrongQueens } from '../state/gameReducer'
import {
  getDailyChallenge,
  getInProgress,
  getProgress,
  getSettings,
  recordCompletion,
  recordFreePlayCompletion,
  saveInProgress,
  setAutoPlaceX,
  spendCoins,
  type InProgressLevel,
  type Settings as AppSettings,
} from '../storage/db'
import { getFreePlayLevel, getNextLevel } from '../games/queensLevels'
import { getDailyQueensLevel, todayDateKey } from '../games/dailyChallenge'
import { endlessProgress, modifierLabel, modifiersForLevel, type LevelModifiers } from '../games/chapters'
import { useGameLifecycle } from '../hooks/useGameLifecycle'
import { useGameCompletion } from '../hooks/useGameCompletion'
import { useAudio } from '../hooks/useAudio'
import { Board } from '../components/Board'
import { Controls } from '../components/Controls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'
import { FailSheet } from '../components/FailSheet'
import { BossGateSheet } from '../components/BossGateSheet'
import { LevelContext } from '../components/LevelContext'
import { BoltIcon, EyeIcon, FlagIcon, SparkleIcon } from '../components/icons'

const HINT_OPTIONS: HintOption[] = [
  { id: 'reveal-cell', icon: <EyeIcon />, title: 'Reveal a cell', desc: 'Fills one correct square of your choice.', price: 25 },
  { id: 'check', icon: <FlagIcon />, title: 'Check my work', desc: 'Flags anything currently placed wrong.', price: 40 },
  { id: 'solve-region', icon: <SparkleIcon />, title: 'Solve a region', desc: 'Completes one whole colored region.', price: 120 },
]

// First-guess placeholder, not derived from real solve-time data — tune once the user
// has actually played a few Timed boss levels.
const TIMED_BUDGET_MS = 60_000

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

function removeKey(set: Set<string>, key: string): Set<string> {
  if (!set.has(key)) return set
  const next = new Set(set)
  next.delete(key)
  return next
}

/** Queen cells that appeared/disappeared between two board snapshots — used to drive
 *  the retract ghost (on Undo) and the hint pulse (on a reveal hint). X-only changes
 *  aren't tracked; only queen placement/removal is animated. */
function diffQueenCells(prev: CellState[][], next: CellState[][]): { removed: Coord[]; added: Coord[] } {
  const removed: Coord[] = []
  const added: Coord[] = []
  for (let r = 0; r < prev.length; r++) {
    for (let c = 0; c < prev[r].length; c++) {
      const wasQueen = prev[r][c]?.queen ?? false
      const isQueen = next[r]?.[c]?.queen ?? false
      if (wasQueen && !isQueen) removed.push({ row: r, col: c })
      else if (!wasQueen && isQueen) added.push({ row: r, col: c })
    }
  }
  return { removed, added }
}

interface ReplayLocationState {
  replayLevel?: LevelRecord
}

export default function GamePage({ freePlay = false }: { freePlay?: boolean }) {
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
  const [modifiers, setModifiers] = useState<LevelModifiers | null>(null)
  // Set only for a normal (non-daily, non-replay) run — see the init effect below —
  // which is exactly when the level-context row ("Chapter 3 · Garden Path · 7/20") has
  // something to show.
  const [levelIndex, setLevelIndex] = useState<number | null>(null)
  // Retract-ghost / hint-pulse targets, keyed by coordKey — see diffQueenCells above
  // and the board-diff effect below. `actingRef` tells that effect whether the change
  // it's about to see was caused by Undo or a hint reveal (both are otherwise
  // indistinguishable full-board swaps) — plain placements leave it null, so they
  // never populate either set.
  const [retractedCells, setRetractedCells] = useState<Set<string>>(new Set())
  const [hintedCells, setHintedCells] = useState<Set<string>>(new Set())
  const actingRef = useRef<'undo' | 'hint' | null>(null)
  const prevBoardRef = useRef(state.board)
  const [failed, setFailed] = useState<{ reason: 'timeout' | 'mistake' } | null>(null)
  // True while a boss level's modifiers are on screen for confirmation but not yet
  // acknowledged — see the init effect below and handleBeginBoss.
  const [awaitingBossConfirm, setAwaitingBossConfirm] = useState(false)
  const [bossChapter, setBossChapter] = useState<number | null>(null)
  const pendingLoadRef = useRef<{ inProgress: InProgressLevel | undefined; settings: AppSettings } | null>(null)
  const sourceRef = useRef<{ source: 'bank' | 'generated'; bankIndex?: number }>({ source: 'generated' })
  // Set during load if today's Daily Challenge was already completed — the win effect
  // reads this to skip re-awarding coins on a replay (recordDailyChallengeCompletion
  // would otherwise let a player farm coins by re-solving the same puzzle all day).
  const dailyAlreadyCompletedRef = useRef(false)
  // Captured once at mount — GamePage always remounts fresh on navigation into this
  // route (Complete -> Game is always a route change), so this never needs to react
  // to a later location.state change.
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)

  // Shared by the init effect's normal path and handleBeginBoss (post-gate) below —
  // dispatches the actual LOAD once we know we're clear to start playing.
  const finishLoad = useCallback(
    async (inProgress: InProgressLevel | undefined, settings: AppSettings) => {
      if (inProgress) {
        sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
        dispatch({
          type: 'LOAD',
          level: inProgress.level,
          autoPlaceX: settings.autoPlaceX,
          snapshot: { board: inProgress.board, elapsedMs: inProgress.elapsedMs },
        })
        return
      }
      const next = await getNextLevel(validDifficulty as Difficulty)
      sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
      dispatch({ type: 'LOAD', level: next.level, autoPlaceX: settings.autoPlaceX })
    },
    [validDifficulty],
  )

  const handleBeginBoss = useCallback(async () => {
    const pending = pendingLoadRef.current
    if (!pending) return
    setAwaitingBossConfirm(false)
    setLoading(true)
    try {
      await finishLoad(pending.inProgress, pending.settings)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [finishLoad])

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
      setModifiers(null)
      setLevelIndex(null)
      setFailed(null)
      setAwaitingBossConfirm(false)
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
          const [settings, existing] = await Promise.all([getSettings(), getDailyChallenge(dateKey, 'queens')])
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'generated' }
          dailyAlreadyCompletedRef.current = !!existing
          const level = getDailyQueensLevel(dateKey)
          dispatch({ type: 'LOAD', level, autoPlaceX: settings.autoPlaceX })
          return
        }

        // Free Play: always a fresh procedural level, no bank/currentLevelIndex, no
        // resume, no boss gate — entirely separate from the chapter system below.
        if (freePlay) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          const next = await getFreePlayLevel(validDifficulty as Difficulty)
          sourceRef.current = { source: next.source }
          dispatch({ type: 'LOAD', level: next.level, autoPlaceX: settings.autoPlaceX })
          return
        }

        const [settings, inProgress, progress] = await Promise.all([
          getSettings(),
          getInProgress(validDifficulty as Difficulty),
          getProgress(validDifficulty as Difficulty),
        ])
        if (cancelled) return
        setCoins(settings.coins)
        // currentLevelIndex doesn't change while a level is in progress (only on
        // completion), so this is correct whether we're about to resume or load fresh —
        // and it's how Endless boss levels (see games/chapters.ts) get their modifiers,
        // and how the level-context row derives its chapter/Endless label below.
        setLevelIndex(progress.currentLevelIndex)
        let levelModifiers: LevelModifiers | null = null
        if (validDifficulty === 'hard') {
          const endless = endlessProgress(progress.currentLevelIndex)
          levelModifiers = modifiersForLevel(endless)
          setModifiers(levelModifiers)
          setBossChapter(endless?.endlessChapter ?? null)
        }

        // Announce a boss level's modifiers up front instead of letting the player
        // discover them mid-run — hold the actual LOAD until they tap "Begin" (see
        // handleBeginBoss and BossGateSheet below).
        if (levelModifiers) {
          pendingLoadRef.current = { inProgress, settings }
          setAwaitingBossConfirm(true)
          return
        }

        await finishLoad(inProgress, settings)
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
  }, [validDifficulty, isDaily, freePlay, finishLoad])

  // Attributes a board change to Undo or a hint reveal (see actingRef above) and turns
  // it into the matching ghost/pulse targets — runs after every board change, but only
  // ever does anything when actingRef was armed just before the dispatch that caused it.
  useEffect(() => {
    if (actingRef.current) {
      const { removed, added } = diffQueenCells(prevBoardRef.current, state.board)
      if (actingRef.current === 'undo' && removed.length > 0) {
        setRetractedCells((prev) => {
          const next = new Set(prev)
          removed.forEach((c) => next.add(coordKey(c)))
          return next
        })
      }
      if (actingRef.current === 'hint' && added.length > 0) {
        setHintedCells((prev) => {
          const next = new Set(prev)
          added.forEach((c) => next.add(coordKey(c)))
          return next
        })
      }
      actingRef.current = null
    }
    prevBoardRef.current = state.board
  }, [state.board])

  useGameLifecycle(loading, error, state.status, dispatch)

  // Autosave in-progress state so leaving and returning resumes this exact board.
  // Daily Challenge intentionally skips this (see src/games/dailyChallenge.ts) — it
  // always restarts fresh from the same deterministic puzzle within a day. Free Play
  // skips it too — every visit is meant to generate a brand new puzzle, not resume.
  useEffect(() => {
    if (loading || !validDifficulty || isDaily || freePlay || state.status !== 'playing') return
    saveInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      board: state.board,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.board, state.elapsedMs, state.level, state.status, loading, validDifficulty, isDaily, freePlay])

  useGameCompletion({
    gameId: 'queens',
    basePath: '/queens',
    status: state.status,
    isDaily,
    isFreePlay: freePlay,
    validDifficulty,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    level: state.level,
    extraKey: 'board',
    extraValue: state.board,
    dailyAlreadyCompletedRef,
    recordCompletion,
    recordFreePlayCompletion,
  })

  // Perfect Run: fails the instant a wrong queen appears, using the same non-mutating
  // check the paid "check" hint already uses — just watched continuously instead of
  // on demand, and only while the modifier is actually active.
  useEffect(() => {
    if (!modifiers?.perfectRun || failed || state.status !== 'playing') return
    if (getWrongQueens(state).size > 0) {
      dispatch({ type: 'PAUSE', now: Date.now() })
      setFailed({ reason: 'mistake' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.board, modifiers, failed, state.status])

  const handleTryAgain = useCallback(async () => {
    if (!validDifficulty) return
    setFailed(null)
    setLoading(true)
    try {
      if (freePlay) {
        const next = await getFreePlayLevel(validDifficulty)
        sourceRef.current = { source: next.source }
        dispatch({ type: 'LOAD', level: next.level, autoPlaceX: state.autoPlaceX })
        return
      }
      const next = await getNextLevel(validDifficulty)
      sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
      dispatch({ type: 'LOAD', level: next.level, autoPlaceX: state.autoPlaceX })
    } finally {
      setLoading(false)
    }
  }, [validDifficulty, state.autoPlaceX, freePlay])

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
      if (id === 'reveal-cell') {
        actingRef.current = 'hint'
        dispatch({ type: 'HINT_REVEAL_CELL', now: Date.now() })
      } else if (id === 'solve-region') {
        actingRef.current = 'hint'
        dispatch({ type: 'HINT_SOLVE_REGION', now: Date.now() })
      }
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

      {validDifficulty && levelIndex !== null && (
        <div className="w-full max-w-[560px]">
          <LevelContext difficulty={validDifficulty} currentLevelIndex={levelIndex} />
        </div>
      )}

      {/* Board and Controls share this single wrapper's width (rather than each
          declaring their own max-width independently) so widening the board to
          reclaim tap-target pixels can never desync the two. Controls stays
          unconditional (Undo/Clear/Auto-X available even while loading, as
          before) — only the board area itself swaps for the loading message. */}
      <div className="-mx-2 flex w-[calc(100%+1rem)] max-w-[560px] flex-col items-center gap-6">
        {modifiers && (
          <p className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-accent-tint px-4 py-2.5 text-center text-[13px] font-bold text-accent">
            <BoltIcon /> Boss level · {modifierLabel(modifiers)}
          </p>
        )}

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
            retractedCells={retractedCells}
            onRetractEnd={(key) => setRetractedCells((prev) => removeKey(prev, key))}
            hintedCells={hintedCells}
            onHintPulseEnd={(key) => setHintedCells((prev) => removeKey(prev, key))}
          />
        )}

        <Controls
          autoPlaceX={state.autoPlaceX}
          canUndo={!modifiers?.noUndo && state.history.length > 0}
          onClear={() => dispatch({ type: 'CLEAR', now: Date.now() })}
          onUndo={() => {
            actingRef.current = 'undo'
            dispatch({ type: 'UNDO' })
          }}
          onToggleAutoX={(enabled) => {
            dispatch({ type: 'SET_AUTO_X', enabled })
            void setAutoPlaceX(enabled)
          }}
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

      {failed && (
        <FailSheet
          reason={failed.reason}
          chaptersHref={freePlay ? '/queens/chapters?tab=free' : '/queens/chapters'}
          onTryAgain={handleTryAgain}
        />
      )}

      {awaitingBossConfirm && modifiers && bossChapter !== null && (
        <BossGateSheet
          chapterNumber={bossChapter}
          modifiers={modifiers}
          backHref="/queens/chapters"
          onBegin={handleBeginBoss}
        />
      )}
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
