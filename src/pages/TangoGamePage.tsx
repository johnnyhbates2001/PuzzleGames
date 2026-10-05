import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import { coordKey, EMPTY, TANGO_SIZE, emptyGrid, type Difficulty, type TangoGrid, type TangoLevelRecord } from '../engine/tango/types'
import { getConflicts } from '../engine/tango/validator'
import { createInitialState, getWrongCells, tangoReducer } from '../state/tangoReducer'
import {
  consumeConsumables,
  getDailyChallenge,
  getSettings,
  getTangoInProgress,
  getTangoProgress,
  recordFreePlayCompletion,
  recordTangoCompletion,
  saveTangoInProgress,
  spendCoins,
  type ConsumableKind,
  type TangoInProgressLevel,
} from '../storage/db'
import { getFreePlayTangoLevel, getNextTangoLevel } from '../games/tangoLevels'
import { getDailyTangoLevel, todayDateKey } from '../games/dailyChallenge'
import {
  chapterForIndex,
  endlessProgress,
  modifierLabel,
  modifiersForLevel,
  modifiersForStoryLevel,
  storyLevelsForTier,
  type LevelModifiers,
} from '../games/chapters'
import { useGameLifecycle } from '../hooks/useGameLifecycle'
import { useGameCompletion, type ChapterReplaySession } from '../hooks/useGameCompletion'
import { useAudio } from '../hooks/useAudio'
import { TangoBoard } from '../components/TangoBoard'
import { TangoControls } from '../components/TangoControls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'
import { FailSheet } from '../components/FailSheet'
import { formatElapsed } from '../components/Timer'
import { BossGateSheet, buildBossAssists, TIME_FREEZE_BONUS_MS, type BossAssist } from '../components/BossGateSheet'
import { LevelContext } from '../components/LevelContext'
import { BoltIcon, EyeIcon, FlagIcon, SparkleIcon } from '../components/icons'

const HINT_OPTIONS: HintOption[] = [
  { id: 'reveal-cell', icon: <EyeIcon />, title: 'Reveal a cell', desc: 'Fills the next square you still need.', price: 25 },
  { id: 'check', icon: <FlagIcon />, title: 'Check my work', desc: 'Flags anything currently placed wrong.', price: 40 },
  { id: 'solve-row', icon: <SparkleIcon />, title: 'Solve a row', desc: 'Completes one whole row.', price: 100 },
]

// First-guess placeholder, not derived from real solve-time data — a 6x6 Tango is a
// couple of minutes; this leaves room for the 8x8 hard tier too.
const TIMED_BUDGET_MS = 150_000

// Content doesn't matter: this state is replaced by LOAD before the player can interact.
const BLANK_GRID: TangoGrid = emptyGrid(TANGO_SIZE.easy)
const PLACEHOLDER_LEVEL: TangoLevelRecord = {
  id: 'placeholder',
  difficulty: 'easy',
  size: TANGO_SIZE.easy,
  givens: BLANK_GRID,
  edges: [],
  solution: BLANK_GRID,
}

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

function removeSetKey(set: Set<string>, key: string): Set<string> {
  if (!set.has(key)) return set
  const next = new Set(set)
  next.delete(key)
  return next
}

/** Cells that went from empty to filled between two grids — what a hint just placed. */
function addedCells(prev: TangoGrid, next: TangoGrid): string[] {
  const out: string[] = []
  next.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v !== EMPTY && prev[r]?.[c] !== v) out.push(coordKey({ row: r, col: c }))
    }),
  )
  return out
}

interface ReplayLocationState {
  replayLevel?: TangoLevelRecord
  chapterReplay?: ChapterReplaySession
}

export default function TangoGamePage({ freePlay = false }: { freePlay?: boolean }) {
  const { difficulty } = useParams<{ difficulty: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isDaily = difficulty === 'daily'
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const { playSound, buzz } = useAudio()

  const [state, dispatch] = useReducer(tangoReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [hintsOpen, setHintsOpen] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const [modifiers, setModifiers] = useState<LevelModifiers | null>(null)
  const [levelIndex, setLevelIndex] = useState<number | null>(null)
  const [hintedCells, setHintedCells] = useState<Set<string>>(new Set())
  const hintingRef = useRef(false)
  const prevGridRef = useRef(state.grid)
  const [failed, setFailed] = useState<{ reason: 'timeout' | 'mistake' } | null>(null)
  const [awaitingBossConfirm, setAwaitingBossConfirm] = useState(false)
  const [bossChapter, setBossChapter] = useState<number | null>(null)
  const [assistOptions, setAssistOptions] = useState<BossAssist[]>([])
  const [selectedAssists, setSelectedAssists] = useState<Set<ConsumableKind>>(new Set())
  const [activeAssists, setActiveAssists] = useState({ undo: false, time: false, mistake: false })
  const mistakeForgivenRef = useRef(false)
  const pendingLoadRef = useRef<{ inProgress: TangoInProgressLevel | undefined } | null>(null)
  const sourceRef = useRef<{ source: 'bank' | 'generated'; bankIndex?: number }>({ source: 'generated' })
  // Set during load if today's Daily Challenge was already completed — the win effect
  // reads this to skip re-awarding coins on a replay.
  const dailyAlreadyCompletedRef = useRef(false)
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)
  const initialChapterReplayRef = useRef((location.state as ReplayLocationState | null)?.chapterReplay)

  const finishLoad = useCallback(
    async (inProgress: TangoInProgressLevel | undefined) => {
      if (inProgress) {
        sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
        dispatch({ type: 'LOAD', level: inProgress.level, snapshot: { grid: inProgress.grid, elapsedMs: inProgress.elapsedMs } })
        return
      }
      const next = await getNextTangoLevel(validDifficulty as Difficulty)
      sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
      dispatch({ type: 'LOAD', level: next.level })
    },
    [validDifficulty],
  )

  const handleBeginBoss = useCallback(async () => {
    const pending = pendingLoadRef.current
    if (!pending) return
    setAwaitingBossConfirm(false)
    setLoading(true)
    try {
      const applied = await consumeConsumables([...selectedAssists])
      setActiveAssists({
        undo: applied.includes('undoToken'),
        time: applied.includes('timeFreeze'),
        mistake: applied.includes('mistakeSave'),
      })
      mistakeForgivenRef.current = false
      await finishLoad(pending.inProgress)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [finishLoad, selectedAssists])

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
      setAssistOptions([])
      setSelectedAssists(new Set())
      setActiveAssists({ undo: false, time: false, mistake: false })
      mistakeForgivenRef.current = false
      try {
        const chapterReplay = initialChapterReplayRef.current
        if (chapterReplay) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'bank' }
          dispatch({ type: 'LOAD', level: chapterReplay.levels[chapterReplay.index] as TangoLevelRecord })
          return
        }

        const replayLevel = initialReplayLevelRef.current
        if (replayLevel) {
          getSettings().then((s) => !cancelled && setCoins(s.coins))
          dispatch({ type: 'LOAD', level: replayLevel })
          return
        }

        if (isDaily) {
          const dateKey = todayDateKey()
          const [settings, existing] = await Promise.all([getSettings(), getDailyChallenge(dateKey, 'tango')])
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'generated' }
          dailyAlreadyCompletedRef.current = !!existing
          dispatch({ type: 'LOAD', level: getDailyTangoLevel(dateKey) })
          return
        }

        // Free Play: always a fresh procedural level, no bank/currentLevelIndex, no
        // resume, no boss gate — entirely separate from the chapter system below.
        if (freePlay) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          const next = await getFreePlayTangoLevel(validDifficulty as Difficulty)
          sourceRef.current = { source: next.source }
          dispatch({ type: 'LOAD', level: next.level })
          return
        }

        const [settings, inProgress, progress] = await Promise.all([
          getSettings(),
          getTangoInProgress(validDifficulty as Difficulty),
          getTangoProgress(validDifficulty as Difficulty),
        ])
        if (cancelled) return
        setCoins(settings.coins)
        setLevelIndex(progress.currentLevelIndex)
        let levelModifiers: LevelModifiers | null = null
        if (progress.currentLevelIndex < storyLevelsForTier(validDifficulty as Difficulty)) {
          const story = chapterForIndex(progress.currentLevelIndex, validDifficulty as Difficulty)
          levelModifiers = modifiersForStoryLevel(story.chapterNumber, story.isBoss)
          setModifiers(levelModifiers)
          setBossChapter(story.isBoss ? story.chapterNumber : null)
        } else if (validDifficulty === 'hard') {
          const endless = endlessProgress(progress.currentLevelIndex)
          levelModifiers = modifiersForLevel(endless)
          setModifiers(levelModifiers)
          setBossChapter(endless?.endlessChapter ?? null)
        }

        if (levelModifiers) {
          pendingLoadRef.current = { inProgress }
          setAssistOptions(buildBossAssists(levelModifiers, settings))
          setAwaitingBossConfirm(true)
          return
        }

        await finishLoad(inProgress)
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

  useEffect(() => {
    if (hintingRef.current) {
      const added = addedCells(prevGridRef.current, state.grid)
      if (added.length > 0) setHintedCells((prev) => new Set([...prev, ...added]))
      hintingRef.current = false
    }
    prevGridRef.current = state.grid
  }, [state.grid])

  useGameLifecycle(loading, error, state.status, dispatch)

  // Autosave in-progress state so leaving and returning resumes this exact board.
  // Daily Challenge and Free Play skip this, same as every other game.
  useEffect(() => {
    if (loading || !validDifficulty || isDaily || freePlay || initialChapterReplayRef.current || state.status !== 'playing') return
    void saveTangoInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      grid: state.grid,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.grid, state.elapsedMs, state.level, state.status, loading, validDifficulty, isDaily, freePlay])

  useGameCompletion({
    gameId: 'tango',
    basePath: '/tango',
    status: state.status,
    isDaily,
    isFreePlay: freePlay,
    chapterReplay: initialChapterReplayRef.current ?? null,
    validDifficulty,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    level: state.level,
    extraKey: 'grid',
    extraValue: state.grid,
    dailyAlreadyCompletedRef,
    recordCompletion: recordTangoCompletion,
    recordFreePlayCompletion,
  })

  // Perfect Run: fails the instant a wrong symbol appears — the same check the paid
  // "check" hint uses, watched continuously while the modifier is active.
  useEffect(() => {
    if (!modifiers?.perfectRun || failed || state.status !== 'playing') return
    if (getWrongCells(state).size > 0) {
      if (activeAssists.mistake && !mistakeForgivenRef.current) {
        mistakeForgivenRef.current = true
        return
      }
      dispatch({ type: 'PAUSE', now: Date.now() })
      setFailed({ reason: 'mistake' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.grid, modifiers, failed, state.status, activeAssists.mistake])

  const handleTryAgain = useCallback(async () => {
    if (!validDifficulty) return
    setFailed(null)
    setLoading(true)
    try {
      if (freePlay) {
        const next = await getFreePlayTangoLevel(validDifficulty)
        sourceRef.current = { source: next.source }
        dispatch({ type: 'LOAD', level: next.level })
        return
      }
      const next = await getNextTangoLevel(validDifficulty)
      sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
      dispatch({ type: 'LOAD', level: next.level })
    } finally {
      setLoading(false)
    }
  }, [validDifficulty, freePlay])

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      playSound('tap')
      buzz(10)
      dispatch({ type: 'CYCLE_CELL', row, col, now: Date.now() })
    },
    [playSound, buzz],
  )

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
      hintingRef.current = true
      if (id === 'reveal-cell') dispatch({ type: 'HINT_REVEAL_CELL', now: Date.now() })
      else if (id === 'solve-row') dispatch({ type: 'HINT_SOLVE_ROW', now: Date.now() })
      setHintsOpen(false)
    },
    [state, playSound],
  )

  const conflicts = useMemo(() => getConflicts(state.grid, state.level.edges), [state.grid, state.level.edges])

  const failChips = useMemo(() => {
    if (!failed) return undefined
    const chips: string[] = []
    if (modifiers?.timed) chips.push(`Timed · ${formatElapsed(TIMED_BUDGET_MS + (activeAssists.time ? TIME_FREEZE_BONUS_MS : 0))}`)
    const filled = state.grid.reduce((sum, row) => sum + row.filter((v) => v !== EMPTY).length, 0)
    chips.push(`Reached ${filled} of ${state.level.size * state.level.size}`)
    return chips
  }, [failed, modifiers, state.grid, state.level.size, activeAssists.time])

  if (!validDifficulty && !isDaily) {
    return <ErrorScreen message="Unknown difficulty." onBack={() => navigate('/tango')} />
  }
  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/tango')} />
  }

  return (
    <main
      data-game="tango"
      className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-6 bg-bg px-4 py-[max(1.5rem,env(safe-area-inset-top))] text-ink"
    >
      <GameHeader
        elapsedMs={state.elapsedMs}
        runStartedAt={state.runStartedAt}
        coins={coins}
        timerKey={state.level.id}
        budgetMs={modifiers?.timed ? TIMED_BUDGET_MS + (activeAssists.time ? TIME_FREEZE_BONUS_MS : 0) : undefined}
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
        <div className="w-full max-w-[420px]">
          <LevelContext difficulty={validDifficulty} currentLevelIndex={levelIndex} />
        </div>
      )}

      <div className="flex w-full max-w-[420px] flex-col items-center gap-4">
        {modifiers && (
          <p className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-accent-tint px-4 py-2.5 text-center text-[13px] font-bold text-accent">
            <BoltIcon /> Boss level · {modifierLabel(modifiers)}
          </p>
        )}

        {loading ? (
          <p className="text-ink-muted">Loading level…</p>
        ) : (
          <TangoBoard
            grid={state.grid}
            givens={state.level.givens}
            edges={state.level.edges}
            conflicts={conflicts}
            solved={state.status === 'won'}
            onCellClick={handleCellClick}
            hintedCells={hintedCells}
            onHintPulseEnd={(key) => setHintedCells((prev) => removeSetKey(prev, key))}
          />
        )}

        <TangoControls
          canUndo={(!modifiers?.noUndo || activeAssists.undo) && state.history.length > 0}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onClear={() => dispatch({ type: 'CLEAR' })}
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
          chaptersHref={freePlay ? '/tango/chapters?tab=free' : '/tango/chapters'}
          onTryAgain={handleTryAgain}
          chips={failChips}
        />
      )}

      {awaitingBossConfirm && modifiers && bossChapter !== null && (
        <BossGateSheet
          chapterNumber={bossChapter}
          modifiers={modifiers}
          backHref="/tango/chapters"
          onBegin={handleBeginBoss}
          assists={assistOptions}
          selectedAssists={selectedAssists}
          onToggleAssist={(kind) =>
            setSelectedAssists((prev) => {
              const next = new Set(prev)
              if (next.has(kind)) next.delete(kind)
              else next.add(kind)
              return next
            })
          }
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
