import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import { coordKey, type Coord, type Difficulty, type ZipLevelRecord } from '../engine/zip/types'
import { applyCellEntry } from '../engine/zip/validator'
import { createInitialState, getWrongCells, zipReducer } from '../state/zipReducer'
import {
  getDailyChallenge,
  getSettings,
  getZipInProgress,
  getZipProgress,
  recordFreePlayCompletion,
  recordZipCompletion,
  saveZipInProgress,
  spendCoins,
  type ZipInProgressLevel,
} from '../storage/db'
import { getFreePlayZipLevel, getNextZipLevel } from '../games/zipLevels'
import { getDailyZipLevel, todayDateKey } from '../games/dailyChallenge'
import { endlessProgress, modifierLabel, modifiersForLevel, type LevelModifiers } from '../games/chapters'
import { useGameLifecycle } from '../hooks/useGameLifecycle'
import { useGameCompletion, type ChapterReplaySession } from '../hooks/useGameCompletion'
import { useAudio } from '../hooks/useAudio'
import { ZipBoard } from '../components/ZipBoard'
import { ZipControls } from '../components/ZipControls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'
import { FailSheet } from '../components/FailSheet'
import { formatElapsed } from '../components/Timer'
import { BossGateSheet } from '../components/BossGateSheet'
import { LevelContext } from '../components/LevelContext'
import { BoltIcon, EyeIcon, FlagIcon } from '../components/icons'

const HINT_OPTIONS: HintOption[] = [
  { id: 'reveal-next', icon: <EyeIcon />, title: 'Reveal next step', desc: 'Extends your path by one correct cell.', price: 25 },
  { id: 'check', icon: <FlagIcon />, title: 'Check my work', desc: 'Flags any step that strayed from the path.', price: 40 },
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

function removeKey(set: Set<string>, key: string): Set<string> {
  if (!set.has(key)) return set
  const next = new Set(set)
  next.delete(key)
  return next
}

/** Path cells that appeared/disappeared between two path snapshots — used to drive
 *  the retract ghost (on Undo) and the hint pulse (on a reveal hint). */
function diffZipCells(prev: Coord[], next: Coord[]): { removed: Coord[]; added: Coord[] } {
  const prevKeys = new Set(prev.map(coordKey))
  const nextKeys = new Set(next.map(coordKey))
  const removed = prev.filter((c) => !nextKeys.has(coordKey(c)))
  const added = next.filter((c) => !prevKeys.has(coordKey(c)))
  return { removed, added }
}

interface ReplayLocationState {
  replayLevel?: ZipLevelRecord
  chapterReplay?: ChapterReplaySession
}

export default function ZipGamePage({ freePlay = false }: { freePlay?: boolean }) {
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
  const [justReachedCheckpoint, setJustReachedCheckpoint] = useState<number | null>(null)
  const [modifiers, setModifiers] = useState<LevelModifiers | null>(null)
  const [levelIndex, setLevelIndex] = useState<number | null>(null)
  // Retract-ghost / hint-pulse targets, keyed by coordKey — see diffZipCells above and
  // the path-diff effect below. `actingRef` tells that effect whether the change it's
  // about to see was caused by Undo or a hint reveal (plain path entries leave it null).
  const [retractedCells, setRetractedCells] = useState<Set<string>>(new Set())
  const [hintedCells, setHintedCells] = useState<Set<string>>(new Set())
  const actingRef = useRef<'undo' | 'hint' | null>(null)
  const prevPathRef = useRef(state.path)
  const [failed, setFailed] = useState<{ reason: 'timeout' | 'mistake' } | null>(null)
  const [awaitingBossConfirm, setAwaitingBossConfirm] = useState(false)
  const [bossChapter, setBossChapter] = useState<number | null>(null)
  const pendingLoadRef = useRef<{ inProgress: ZipInProgressLevel | undefined } | null>(null)
  const sourceRef = useRef<{ source: 'bank' | 'generated'; bankIndex?: number }>({ source: 'generated' })
  // Set during load if today's Daily Challenge was already completed — the win effect
  // reads this to skip re-awarding coins on a replay (recordDailyChallengeCompletion
  // would otherwise let a player farm coins by re-solving the same puzzle all day).
  const dailyAlreadyCompletedRef = useRef(false)
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)
  const initialChapterReplayRef = useRef((location.state as ReplayLocationState | null)?.chapterReplay)

  const finishLoad = useCallback(
    async (inProgress: ZipInProgressLevel | undefined) => {
      if (inProgress) {
        sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
        dispatch({ type: 'LOAD', level: inProgress.level, snapshot: { path: inProgress.path, elapsedMs: inProgress.elapsedMs } })
        return
      }
      const next = await getNextZipLevel(validDifficulty as Difficulty)
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
          dispatch({ type: 'LOAD', level: chapterReplay.levels[chapterReplay.index] as ZipLevelRecord })
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
          const [settings, existing] = await Promise.all([getSettings(), getDailyChallenge(dateKey, 'zip')])
          if (cancelled) return
          setCoins(settings.coins)
          dailyAlreadyCompletedRef.current = !!existing
          const level = getDailyZipLevel(dateKey)
          dispatch({ type: 'LOAD', level })
          return
        }

        // Free Play: always a fresh procedural level, no bank/currentLevelIndex, no
        // resume, no boss gate — entirely separate from the chapter system below.
        if (freePlay) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          const next = await getFreePlayZipLevel(validDifficulty as Difficulty)
          sourceRef.current = { source: next.source }
          dispatch({ type: 'LOAD', level: next.level })
          return
        }

        const [settings, inProgress, progress] = await Promise.all([
          getSettings(),
          getZipInProgress(validDifficulty as Difficulty),
          getZipProgress(validDifficulty as Difficulty),
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
      const { removed, added } = diffZipCells(prevPathRef.current, state.path)
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
    prevPathRef.current = state.path
  }, [state.path])

  useGameLifecycle(loading, error, state.status, dispatch)

  // Autosave in-progress state so leaving and returning resumes this exact board.
  // Daily Challenge intentionally skips this (see src/games/dailyChallenge.ts) — it
  // always restarts fresh from the same deterministic puzzle within a day. Free Play
  // skips it too — every visit is meant to generate a brand new puzzle, not resume.
  useEffect(() => {
    if (loading || !validDifficulty || isDaily || freePlay || initialChapterReplayRef.current || state.status !== 'playing') return
    saveZipInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      path: state.path,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.path, state.elapsedMs, state.level, state.status, loading, validDifficulty, isDaily, freePlay])

  useGameCompletion({
    gameId: 'zip',
    basePath: '/zip',
    status: state.status,
    isDaily,
    isFreePlay: freePlay,
    chapterReplay: initialChapterReplayRef.current ?? null,
    validDifficulty,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    level: state.level,
    extraKey: 'path',
    extraValue: state.path,
    dailyAlreadyCompletedRef,
    recordCompletion: recordZipCompletion,
    recordFreePlayCompletion,
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
      if (freePlay) {
        const next = await getFreePlayZipLevel(validDifficulty)
        sourceRef.current = { source: next.source }
        dispatch({ type: 'LOAD', level: next.level })
        return
      }
      const next = await getNextZipLevel(validDifficulty)
      sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
      dispatch({ type: 'LOAD', level: next.level })
    } finally {
      setLoading(false)
    }
  }, [validDifficulty, freePlay])

  // Context chips for FailSheet — only meaningful while `failed` is set (a boss-
  // modifier watcher just fired), so no need to compute this on every render.
  const failChips = useMemo(() => {
    if (!failed) return undefined
    const chips: string[] = []
    if (modifiers?.timed) chips.push(`Timed · ${formatElapsed(TIMED_BUDGET_MS)}`)
    chips.push(`Reached ${state.path.length} of ${state.level.size * state.level.size}`)
    return chips
  }, [failed, modifiers, state.path, state.level.size])

  const nextCheckpoint = useMemo(() => {
    const idx = state.level.checkpoints.findIndex(
      (cp) => !state.path.some((p) => p.row === cp.row && p.col === cp.col),
    )
    return idx === -1 ? null : idx + 1
  }, [state.level.checkpoints, state.path])

  // Pulses whichever checkpoint nextCheckpoint just advanced past — the ref establishes
  // a silent baseline on every fresh level load/resume so resuming an in-progress path
  // (already partway through) doesn't fire a pulse for checkpoints reached before this
  // mount.
  const prevNextCheckpointRef = useRef(nextCheckpoint)
  const prevLevelIdRef = useRef(state.level.id)
  useEffect(() => {
    if (prevLevelIdRef.current !== state.level.id) {
      prevLevelIdRef.current = state.level.id
      prevNextCheckpointRef.current = nextCheckpoint
      return
    }
    const prev = prevNextCheckpointRef.current
    if (prev !== null && prev !== nextCheckpoint) {
      setJustReachedCheckpoint(prev)
    }
    prevNextCheckpointRef.current = nextCheckpoint
  }, [nextCheckpoint, state.level.id])

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
      if (id === 'reveal-next') {
        actingRef.current = 'hint'
        dispatch({ type: 'HINT_REVEAL_NEXT', now: Date.now() })
      }
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
          <ZipBoard
            level={state.level}
            path={state.path}
            onCellEnter={handleCellEnter}
            rejectedCell={rejectedCell}
            onRejectedShakeEnd={() => setRejectedCell(null)}
            justReachedCheckpoint={justReachedCheckpoint}
            onCheckpointPulseEnd={() => setJustReachedCheckpoint(null)}
            solved={state.status === 'won'}
            retractedCells={retractedCells}
            onRetractEnd={(key) => setRetractedCells((prev) => removeKey(prev, key))}
            hintedCells={hintedCells}
            onHintPulseEnd={(key) => setHintedCells((prev) => removeKey(prev, key))}
          />
        )}

        <ZipControls
          canUndo={!modifiers?.noUndo && state.history.length > 0}
          canClear={state.path.length > 0}
          onUndo={() => {
            actingRef.current = 'undo'
            dispatch({ type: 'UNDO' })
          }}
          onClear={() => dispatch({ type: 'CLEAR', now: Date.now() })}
          onOpenHints={() => {
            setCheckMessage(null)
            setHintsOpen(true)
          }}
          nextCheckpoint={nextCheckpoint}
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
          chaptersHref={freePlay ? '/zip/chapters?tab=free' : '/zip/chapters'}
          onTryAgain={handleTryAgain}
          chips={failChips}
        />
      )}

      {awaitingBossConfirm && modifiers && bossChapter !== null && (
        <BossGateSheet chapterNumber={bossChapter} modifiers={modifiers} backHref="/zip/chapters" onBegin={handleBeginBoss} />
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
