import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import { rectCells, type Difficulty, type PatchesLevelRecord } from '../engine/patches/types'
import { createInitialState, getWrongCells, patchesReducer } from '../state/patchesReducer'
import type { PlacedRect } from '../engine/patches/validator'
import {
  getDailyChallenge,
  getPatchesInProgress,
  getPatchesProgress,
  getSettings,
  recordFreePlayCompletion,
  recordPatchesCompletion,
  savePatchesInProgress,
  spendCoins,
  type PatchesInProgressLevel,
} from '../storage/db'
import { getFreePlayPatchesLevel, getNextPatchesLevel } from '../games/patchesLevels'
import { getDailyPatchesLevel, todayDateKey } from '../games/dailyChallenge'
import { endlessProgress, modifierLabel, modifiersForLevel, type LevelModifiers } from '../games/chapters'
import { useGameLifecycle } from '../hooks/useGameLifecycle'
import { useGameCompletion, type ChapterReplaySession } from '../hooks/useGameCompletion'
import { useAudio } from '../hooks/useAudio'
import { PatchesBoard } from '../components/PatchesBoard'
import { PatchesControls } from '../components/PatchesControls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'
import { FailSheet } from '../components/FailSheet'
import { formatElapsed } from '../components/Timer'
import { BossGateSheet } from '../components/BossGateSheet'
import { LevelContext } from '../components/LevelContext'
import { BoltIcon, FlagIcon, SparkleIcon } from '../components/icons'

const HINT_OPTIONS: HintOption[] = [
  { id: 'check', icon: <FlagIcon />, title: 'Check my work', desc: 'Flags any placed patch with the wrong size.', price: 40 },
  { id: 'reveal-clue', icon: <SparkleIcon />, title: 'Reveal a patch', desc: "Places one clue's correct rectangle.", price: 120 },
]

const SHAPE_LEGEND: { shape: 'square' | 'wide' | 'tall'; label: string; className: string }[] = [
  { shape: 'square', label: 'Square', className: 'aspect-square' },
  { shape: 'wide', label: 'Wide', className: 'aspect-[3/2]' },
  { shape: 'tall', label: 'Tall', className: 'aspect-[2/3]' },
]

// First-guess placeholder, not derived from real solve-time data — tune once the user
// has actually played a few Timed boss levels.
const TIMED_BUDGET_MS = 75_000

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

function removeKey(set: Set<string>, key: string): Set<string> {
  if (!set.has(key)) return set
  const next = new Set(set)
  next.delete(key)
  return next
}

interface RetractGhost {
  id: number
  rect: PlacedRect
}

interface ReplayLocationState {
  replayLevel?: PatchesLevelRecord
  chapterReplay?: ChapterReplaySession
}

export default function PatchesGamePage({ freePlay = false }: { freePlay?: boolean }) {
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
  const [modifiers, setModifiers] = useState<LevelModifiers | null>(null)
  const [levelIndex, setLevelIndex] = useState<number | null>(null)
  // Retract-ghost (full removed rects, since a ghost needs its own fill color and
  // footprint — the real rect is already gone from state.placed by the time we know)
  // and hint-pulse targets (just coordKeys — the real content is already there).
  // `actingRef` tells the placed-diff effect below whether the change it's about to
  // see was caused by Undo or a hint reveal (plain placements/removals leave it null).
  const [retractedRects, setRetractedRects] = useState<RetractGhost[]>([])
  const [hintedCells, setHintedCells] = useState<Set<string>>(new Set())
  const actingRef = useRef<'undo' | 'hint' | null>(null)
  const prevPlacedRef = useRef(state.placed)
  const retractIdRef = useRef(0)
  const [failed, setFailed] = useState<{ reason: 'timeout' | 'mistake' } | null>(null)
  const [awaitingBossConfirm, setAwaitingBossConfirm] = useState(false)
  const [bossChapter, setBossChapter] = useState<number | null>(null)
  const pendingLoadRef = useRef<{ inProgress: PatchesInProgressLevel | undefined } | null>(null)
  const sourceRef = useRef<{ source: 'bank' | 'generated'; bankIndex?: number }>({ source: 'generated' })
  // Set during load if today's Daily Challenge was already completed — the win effect
  // reads this to skip re-awarding coins on a replay (recordDailyChallengeCompletion
  // would otherwise let a player farm coins by re-solving the same puzzle all day).
  const dailyAlreadyCompletedRef = useRef(false)
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)
  const initialChapterReplayRef = useRef((location.state as ReplayLocationState | null)?.chapterReplay)

  const finishLoad = useCallback(
    async (inProgress: PatchesInProgressLevel | undefined) => {
      if (inProgress) {
        sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
        dispatch({ type: 'LOAD', level: inProgress.level, snapshot: { placed: inProgress.placed, elapsedMs: inProgress.elapsedMs } })
        return
      }
      const next = await getNextPatchesLevel(validDifficulty as Difficulty)
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
      await finishLoad(pending.inProgress)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [finishLoad])

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
        const chapterReplay = initialChapterReplayRef.current
        if (chapterReplay) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'bank' }
          dispatch({ type: 'LOAD', level: chapterReplay.levels[chapterReplay.index] as PatchesLevelRecord })
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
          const [settings, existing] = await Promise.all([getSettings(), getDailyChallenge(dateKey, 'patches')])
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'generated' }
          dailyAlreadyCompletedRef.current = !!existing
          const level = getDailyPatchesLevel(dateKey)
          dispatch({ type: 'LOAD', level })
          return
        }

        // Free Play: always a fresh procedural level, no bank/currentLevelIndex, no
        // resume, no boss gate — entirely separate from the chapter system below.
        if (freePlay) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          const next = await getFreePlayPatchesLevel(validDifficulty as Difficulty)
          sourceRef.current = { source: next.source }
          dispatch({ type: 'LOAD', level: next.level })
          return
        }

        const [settings, inProgress, progress] = await Promise.all([
          getSettings(),
          getPatchesInProgress(validDifficulty as Difficulty),
          getPatchesProgress(validDifficulty as Difficulty),
        ])
        if (cancelled) return
        setCoins(settings.coins)
        setLevelIndex(progress.currentLevelIndex)
        let levelModifiers: LevelModifiers | null = null
        if (validDifficulty === 'hard') {
          const endless = endlessProgress(progress.currentLevelIndex)
          levelModifiers = modifiersForLevel(endless)
          setModifiers(levelModifiers)
          setBossChapter(endless?.endlessChapter ?? null)
        }

        if (levelModifiers) {
          pendingLoadRef.current = { inProgress }
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
    if (actingRef.current) {
      const prevPlaced = prevPlacedRef.current
      const nextPlaced = state.placed
      if (actingRef.current === 'undo' && prevPlaced.length > nextPlaced.length) {
        const removed = prevPlaced.slice(nextPlaced.length)
        setRetractedRects((prev) => [...prev, ...removed.map((rect) => ({ id: retractIdRef.current++, rect }))])
      }
      if (actingRef.current === 'hint' && nextPlaced.length > prevPlaced.length) {
        const added = nextPlaced.slice(prevPlaced.length)
        setHintedCells((prev) => {
          const next = new Set(prev)
          added.forEach((p) => rectCells(p.rect).forEach((c) => next.add(`${c.row},${c.col}`)))
          return next
        })
      }
      actingRef.current = null
    }
    prevPlacedRef.current = state.placed
  }, [state.placed])

  useGameLifecycle(loading, error, state.status, dispatch)

  // Autosave in-progress state so leaving and returning resumes this exact board.
  // Daily Challenge intentionally skips this (see src/games/dailyChallenge.ts) — it
  // always restarts fresh from the same deterministic puzzle within a day. Free Play
  // skips it too — every visit is meant to generate a brand new puzzle, not resume.
  useEffect(() => {
    if (loading || !validDifficulty || isDaily || freePlay || initialChapterReplayRef.current || state.status !== 'playing') return
    savePatchesInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      placed: state.placed,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.placed, state.elapsedMs, state.level, state.status, loading, validDifficulty, isDaily, freePlay])

  useGameCompletion({
    gameId: 'patches',
    basePath: '/patches',
    status: state.status,
    isDaily,
    isFreePlay: freePlay,
    chapterReplay: initialChapterReplayRef.current ?? null,
    validDifficulty,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    level: state.level,
    extraKey: 'placed',
    extraValue: state.placed,
    dailyAlreadyCompletedRef,
    recordCompletion: recordPatchesCompletion,
    recordFreePlayCompletion,
  })

  // Perfect Run: fails the instant a wrong patch appears, using the same non-mutating
  // check the paid "check" hint already uses — just watched continuously instead of
  // on demand, and only while the modifier is actually active.
  useEffect(() => {
    if (!modifiers?.perfectRun || failed || state.status !== 'playing') return
    if (getWrongCells(state).size > 0) {
      dispatch({ type: 'PAUSE', now: Date.now() })
      setFailed({ reason: 'mistake' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.placed, modifiers, failed, state.status])

  const handleTryAgain = useCallback(async () => {
    if (!validDifficulty) return
    setFailed(null)
    setLoading(true)
    try {
      if (freePlay) {
        const next = await getFreePlayPatchesLevel(validDifficulty)
        sourceRef.current = { source: next.source }
        dispatch({ type: 'LOAD', level: next.level })
        return
      }
      const next = await getNextPatchesLevel(validDifficulty)
      sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
      dispatch({ type: 'LOAD', level: next.level })
    } finally {
      setLoading(false)
    }
  }, [validDifficulty, freePlay])

  const handleStartDrag = useCallback(
    (row: number, col: number) => {
      playSound('tap')
      buzz(10)
      dispatch({ type: 'START_DRAG', row, col })
    },
    [playSound, buzz],
  )

  const handleDragMove = useCallback((row: number, col: number) => {
    dispatch({ type: 'DRAG_MOVE', row, col })
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
      if (id === 'reveal-clue') {
        actingRef.current = 'hint'
        dispatch({ type: 'HINT_REVEAL_CLUE', now: Date.now() })
      }
      setHintsOpen(false)
    },
    [state, playSound],
  )

  // Context chips for FailSheet — only meaningful while `failed` is set (a boss-
  // modifier watcher just fired), so no need to compute this on every render.
  const failChips = useMemo(() => {
    if (!failed) return undefined
    const chips: string[] = []
    if (modifiers?.timed) chips.push(`Timed · ${formatElapsed(TIMED_BUDGET_MS)}`)
    chips.push(`Reached ${state.placed.length} of ${state.level.clues.length}`)
    return chips
  }, [failed, modifiers, state.placed, state.level.clues.length])

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
        <div className="w-full max-w-[420px]">
          <LevelContext difficulty={validDifficulty} currentLevelIndex={levelIndex} />
        </div>
      )}

      <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
        {modifiers && (
          <p className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-accent-tint px-4 py-2.5 text-center text-[13px] font-bold text-accent">
            <BoltIcon /> Boss level · {modifierLabel(modifiers)}
          </p>
        )}

        {loading ? (
          <p className="text-ink-muted">Loading level…</p>
        ) : (
          <>
            <PatchesBoard
              level={state.level}
              placed={state.placed}
              dragAnchor={state.dragAnchor}
              dragEnd={state.dragEnd}
              onStartDrag={handleStartDrag}
              onDragMove={handleDragMove}
              onCommitDrag={handleCommitDrag}
              onCancelDrag={handleCancelDrag}
              onRemoveRect={handleRemoveRect}
              solved={state.status === 'won'}
              retractedRects={retractedRects}
              onRetractEnd={(id) => setRetractedRects((prev) => prev.filter((g) => g.id !== id))}
              hintedCells={hintedCells}
              onHintPulseEnd={(key) => setHintedCells((prev) => removeKey(prev, key))}
            />
            <div className="flex gap-4">
              {SHAPE_LEGEND.map(({ shape, label, className }) => (
                <span key={shape} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-muted opacity-75">
                  <span className={`h-3.5 rounded-[3px] border-2 border-ink-muted ${className}`} />
                  {label}
                </span>
              ))}
            </div>
          </>
        )}

        <PatchesControls
          canUndo={!modifiers?.noUndo && state.placed.length > 0}
          canClear={state.placed.length > 0}
          onUndo={() => {
            actingRef.current = 'undo'
            dispatch({ type: 'UNDO' })
          }}
          onClear={() => dispatch({ type: 'CLEAR' })}
          onOpenHints={() => {
            setCheckMessage(null)
            setHintsOpen(true)
          }}
          cluesLeft={Math.max(0, state.level.clues.length - state.placed.length)}
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
          chaptersHref={freePlay ? '/patches/chapters?tab=free' : '/patches/chapters'}
          onTryAgain={handleTryAgain}
          chips={failChips}
        />
      )}

      {awaitingBossConfirm && modifiers && bossChapter !== null && (
        <BossGateSheet
          chapterNumber={bossChapter}
          modifiers={modifiers}
          backHref="/patches/chapters"
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
