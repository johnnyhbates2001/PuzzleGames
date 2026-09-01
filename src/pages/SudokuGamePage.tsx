import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import { SUDOKU_SIZE, boxIndex, coordKey, type Coord, type Difficulty, type SudokuLevelRecord } from '../engine/sudoku/types'
import { getConflicts } from '../engine/sudoku/validator'
import { createInitialState, getWrongCells, sudokuReducer } from '../state/sudokuReducer'
import { boardValues, digitCounts, type SudokuCellState } from '../state/sudokuTypes'
import {
  getDailyChallenge,
  getSettings,
  getSudokuInProgress,
  getSudokuProgress,
  recordFreePlayCompletion,
  recordSudokuCompletion,
  saveSudokuInProgress,
  spendCoins,
  type SudokuInProgressLevel,
} from '../storage/db'
import { getFreePlaySudokuLevel, getNextSudokuLevel } from '../games/sudokuLevels'
import { getDailySudokuLevel, todayDateKey } from '../games/dailyChallenge'
import { endlessProgress, modifierLabel, modifiersForLevel, type LevelModifiers } from '../games/chapters'
import { useGameLifecycle } from '../hooks/useGameLifecycle'
import { useGameCompletion, type ChapterReplaySession } from '../hooks/useGameCompletion'
import { useAudio } from '../hooks/useAudio'
import { SudokuBoard } from '../components/SudokuBoard'
import { SudokuKeypad } from '../components/SudokuKeypad'
import { SudokuControls } from '../components/SudokuControls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'
import { FailSheet } from '../components/FailSheet'
import { formatElapsed } from '../components/Timer'
import { BossGateSheet } from '../components/BossGateSheet'
import { LevelContext } from '../components/LevelContext'
import { BoltIcon, EyeIcon, FlagIcon, SparkleIcon } from '../components/icons'

const HINT_OPTIONS: HintOption[] = [
  { id: 'reveal-cell', icon: <EyeIcon />, title: 'Reveal a cell', desc: 'Fills one correct square of your choice.', price: 25 },
  { id: 'check', icon: <FlagIcon />, title: 'Check my work', desc: 'Flags anything currently placed wrong.', price: 40 },
  { id: 'solve-box', icon: <SparkleIcon />, title: 'Solve a box', desc: 'Completes one whole 3×3 box.', price: 120 },
]

// First-guess placeholder, not derived from real solve-time data — Sudoku's 9x9 takes
// meaningfully longer to hand-solve than the other games' ~8x8 boards.
const TIMED_BUDGET_MS = 180_000

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

function removeSetKey(set: Set<string>, key: string): Set<string> {
  if (!set.has(key)) return set
  const next = new Set(set)
  next.delete(key)
  return next
}

function removeMapKey<T>(map: Map<string, T>, key: string): Map<string, T> {
  if (!map.has(key)) return map
  const next = new Map(map)
  next.delete(key)
  return next
}

/** Cells whose value changed between two board snapshots. `removed`/`added` cover the
 *  0<->nonzero transitions Undo and a reveal-hint each produce; `changed` covers every
 *  value change (including an overwrite), used to find the just-placed digit for the
 *  unit-complete check. */
function diffSudokuCells(prev: SudokuCellState[][], next: SudokuCellState[][]): { removed: Coord[]; added: Coord[]; changed: Coord[] } {
  const removed: Coord[] = []
  const added: Coord[] = []
  const changed: Coord[] = []
  for (let r = 0; r < prev.length; r++) {
    for (let c = 0; c < prev[r].length; c++) {
      const prevValue = prev[r][c]?.value ?? 0
      const nextValue = next[r]?.[c]?.value ?? 0
      if (prevValue === nextValue) continue
      changed.push({ row: r, col: c })
      if (prevValue !== 0 && nextValue === 0) removed.push({ row: r, col: c })
      else if (prevValue === 0 && nextValue !== 0) added.push({ row: r, col: c })
    }
  }
  return { removed, added, changed }
}

/** A row/col/box is complete once none of its 9 values are 0 and none repeat. */
function isUnitComplete(values: number[]): boolean {
  return values.every((v) => v !== 0) && new Set(values).size === SUDOKU_SIZE
}

function unitCoords(kind: 'row' | 'col' | 'box', row: number, col: number): Coord[] {
  if (kind === 'row') return Array.from({ length: SUDOKU_SIZE }, (_, c) => ({ row, col: c }))
  if (kind === 'col') return Array.from({ length: SUDOKU_SIZE }, (_, r) => ({ row: r, col }))
  const box = boxIndex(row, col)
  const coords: Coord[] = []
  for (let r = 0; r < SUDOKU_SIZE; r++) {
    for (let c = 0; c < SUDOKU_SIZE; c++) {
      if (boxIndex(r, c) === box) coords.push({ row: r, col: c })
    }
  }
  return coords
}

const UNIT_COMPLETE_STEP_MS = 55

interface ReplayLocationState {
  replayLevel?: SudokuLevelRecord
  chapterReplay?: ChapterReplaySession
}

export default function SudokuGamePage({ freePlay = false }: { freePlay?: boolean }) {
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
  const [ripple, setRipple] = useState<{ row: number; col: number; seq: number } | null>(null)
  const [modifiers, setModifiers] = useState<LevelModifiers | null>(null)
  const [levelIndex, setLevelIndex] = useState<number | null>(null)
  // Retract-ghost (value keyed by coordKey — the removed digit is gone from real state
  // by the time the diff sees it, so the ghost needs to carry its own content), hint-
  // pulse targets, and unit-complete cells. `actingRef` tells the board-diff effect
  // below what caused the change it's about to see (plain placements leave it null).
  const [retractedCells, setRetractedCells] = useState<Map<string, number>>(new Map())
  const [hintedCells, setHintedCells] = useState<Set<string>>(new Set())
  const [completedUnitCells, setCompletedUnitCells] = useState<Map<string, number>>(new Map())
  const actingRef = useRef<'undo' | 'hint' | 'digit' | null>(null)
  const prevBoardRef = useRef(state.board)
  const [failed, setFailed] = useState<{ reason: 'timeout' | 'mistake' } | null>(null)
  const [awaitingBossConfirm, setAwaitingBossConfirm] = useState(false)
  const [bossChapter, setBossChapter] = useState<number | null>(null)
  const pendingLoadRef = useRef<{ inProgress: SudokuInProgressLevel | undefined } | null>(null)
  const sourceRef = useRef<{ source: 'bank' | 'generated'; bankIndex?: number }>({ source: 'generated' })
  // Set during load if today's Daily Challenge was already completed — the win effect
  // reads this to skip re-awarding coins on a replay (recordDailyChallengeCompletion
  // would otherwise let a player farm coins by re-solving the same puzzle all day).
  const dailyAlreadyCompletedRef = useRef(false)
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)
  const initialChapterReplayRef = useRef((location.state as ReplayLocationState | null)?.chapterReplay)

  const finishLoad = useCallback(
    async (inProgress: SudokuInProgressLevel | undefined) => {
      if (inProgress) {
        sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
        dispatch({ type: 'LOAD', level: inProgress.level, snapshot: { board: inProgress.board, elapsedMs: inProgress.elapsedMs } })
        return
      }
      const next = await getNextSudokuLevel(validDifficulty as Difficulty)
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
          dispatch({ type: 'LOAD', level: chapterReplay.levels[chapterReplay.index] as SudokuLevelRecord })
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
          const [settings, existing] = await Promise.all([getSettings(), getDailyChallenge(dateKey, 'sudoku')])
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'generated' }
          dailyAlreadyCompletedRef.current = !!existing
          const level = getDailySudokuLevel(dateKey)
          dispatch({ type: 'LOAD', level })
          return
        }

        // Free Play: always a fresh procedural level, no bank/currentLevelIndex, no
        // resume, no boss gate — entirely separate from the chapter system below.
        if (freePlay) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          const next = await getFreePlaySudokuLevel(validDifficulty as Difficulty)
          sourceRef.current = { source: next.source }
          dispatch({ type: 'LOAD', level: next.level })
          return
        }

        const [settings, inProgress, progress] = await Promise.all([
          getSettings(),
          getSudokuInProgress(validDifficulty as Difficulty),
          getSudokuProgress(validDifficulty as Difficulty),
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
      const prevBoard = prevBoardRef.current
      const { removed, added, changed } = diffSudokuCells(prevBoard, state.board)
      if (actingRef.current === 'undo' && removed.length > 0) {
        setRetractedCells((prev) => {
          const next = new Map(prev)
          removed.forEach((c) => next.set(coordKey(c), prevBoard[c.row][c.col].value))
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
      if (actingRef.current === 'digit' && changed.length > 0) {
        const { row, col } = changed[0]
        const prevValues = boardValues(prevBoard)
        const nextValues = boardValues(state.board)
        const newlyComplete = (['row', 'col', 'box'] as const)
          .map((kind) => unitCoords(kind, row, col))
          .filter((unit) => !isUnitComplete(unit.map((p) => prevValues[p.row][p.col])) && isUnitComplete(unit.map((p) => nextValues[p.row][p.col])))
        if (newlyComplete.length > 0) {
          const delays = new Map<string, number>()
          for (const unit of newlyComplete) {
            for (const p of unit) {
              const delay = Math.max(Math.abs(p.row - row), Math.abs(p.col - col)) * UNIT_COMPLETE_STEP_MS
              const key = coordKey(p)
              const existing = delays.get(key)
              if (existing === undefined || delay < existing) delays.set(key, delay)
            }
          }
          setCompletedUnitCells((prev) => new Map([...prev, ...delays]))
        }
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
    if (loading || !validDifficulty || isDaily || freePlay || initialChapterReplayRef.current || state.status !== 'playing') return
    saveSudokuInProgress({
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
    gameId: 'sudoku',
    basePath: '/sudoku',
    status: state.status,
    isDaily,
    isFreePlay: freePlay,
    chapterReplay: initialChapterReplayRef.current ?? null,
    validDifficulty,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    level: state.level,
    extraKey: 'board',
    extraValue: state.board,
    dailyAlreadyCompletedRef,
    recordCompletion: recordSudokuCompletion,
    recordFreePlayCompletion,
  })

  // Perfect Run: fails the instant a wrong digit appears, using the same non-mutating
  // check the paid "check" hint already uses — just watched continuously instead of
  // on demand, and only while the modifier is actually active.
  useEffect(() => {
    if (!modifiers?.perfectRun || failed || state.status !== 'playing') return
    if (getWrongCells(state).size > 0) {
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
        const next = await getFreePlaySudokuLevel(validDifficulty)
        sourceRef.current = { source: next.source }
        dispatch({ type: 'LOAD', level: next.level })
        return
      }
      const next = await getNextSudokuLevel(validDifficulty)
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
      dispatch({ type: 'SELECT_CELL', row, col })
    },
    [playSound, buzz],
  )

  // Purely cosmetic — never touches the reducer/persisted state. Only pulses on an
  // actual value placement (not note-mode toggling, not a no-op re-entry of the same
  // digit, not a given cell), mirroring INPUT_DIGIT's own guards so the ripple only
  // fires when a placement will actually happen.
  const maybeTriggerRipple = useCallback(
    (digit: number) => {
      if (!state.selected || state.noteMode) return
      const { row, col } = state.selected
      const cell = state.board[row][col]
      if (cell.given || cell.value === digit) return
      setRipple((r) => ({ row, col, seq: (r?.seq ?? 0) + 1 }))
    },
    [state.selected, state.noteMode, state.board],
  )

  const handleDigit = useCallback(
    (digit: number) => {
      playSound('tap')
      buzz(10)
      maybeTriggerRipple(digit)
      actingRef.current = 'digit'
      dispatch({ type: 'INPUT_DIGIT', digit, now: Date.now() })
    },
    [playSound, buzz, maybeTriggerRipple],
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
      if (id === 'reveal-cell') {
        actingRef.current = 'hint'
        dispatch({ type: 'HINT_REVEAL_CELL', now: Date.now() })
      } else if (id === 'solve-box') {
        actingRef.current = 'hint'
        dispatch({ type: 'HINT_SOLVE_BOX', now: Date.now() })
      }
      setHintsOpen(false)
    },
    [state, playSound],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= '1' && e.key <= '9') {
        const digit = Number(e.key)
        maybeTriggerRipple(digit)
        actingRef.current = 'digit'
        dispatch({ type: 'INPUT_DIGIT', digit, now: Date.now() })
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        dispatch({ type: 'ERASE', now: Date.now() })
      } else if (e.key.toLowerCase() === 'n') {
        dispatch({ type: 'TOGGLE_NOTE_MODE' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [maybeTriggerRipple])

  const conflicts = useMemo(() => getConflicts(boardValues(state.board)), [state.board])
  const placedCounts = useMemo(() => digitCounts(state.board), [state.board])

  // Context chips for FailSheet — only meaningful while `failed` is set (a boss-
  // modifier watcher just fired), so no need to compute this on every render.
  const failChips = useMemo(() => {
    if (!failed) return undefined
    const chips: string[] = []
    if (modifiers?.timed) chips.push(`Timed · ${formatElapsed(TIMED_BUDGET_MS)}`)
    const filled = state.board.reduce((sum, row) => sum + row.filter((c) => c.value !== 0).length, 0)
    chips.push(`Reached ${filled} of ${SUDOKU_SIZE * SUDOKU_SIZE}`)
    return chips
  }, [failed, modifiers, state.board])
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

      <div className="flex w-full max-w-[420px] flex-col items-center gap-4">
        {modifiers && (
          <p className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-accent-tint px-4 py-2.5 text-center text-[13px] font-bold text-accent">
            <BoltIcon /> Boss level · {modifierLabel(modifiers)}
          </p>
        )}

        {loading ? (
          <p className="text-ink-muted">Loading level…</p>
        ) : (
          <>
            <SudokuBoard
              board={state.board}
              selected={state.selected}
              conflicts={conflicts}
              ripple={ripple}
              solved={state.status === 'won'}
              onCellClick={handleCellClick}
              retractedCells={retractedCells}
              onRetractEnd={(key) => setRetractedCells((prev) => removeMapKey(prev, key))}
              hintedCells={hintedCells}
              onHintPulseEnd={(key) => setHintedCells((prev) => removeSetKey(prev, key))}
              completedUnitCells={completedUnitCells}
              onUnitCompleteEnd={(key) => setCompletedUnitCells((prev) => removeMapKey(prev, key))}
            />
            <SudokuKeypad
              selectedValue={selectedValue}
              digitCounts={placedCounts}
              canErase={state.selected !== null}
              onDigit={handleDigit}
              onErase={handleErase}
            />
          </>
        )}

        <SudokuControls
          canUndo={!modifiers?.noUndo && state.history.length > 0}
          noteMode={state.noteMode}
          onUndo={() => {
            actingRef.current = 'undo'
            dispatch({ type: 'UNDO' })
          }}
          onClear={() => dispatch({ type: 'CLEAR', now: Date.now() })}
          onToggleNoteMode={handleToggleNoteMode}
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
          chaptersHref={freePlay ? '/sudoku/chapters?tab=free' : '/sudoku/chapters'}
          onTryAgain={handleTryAgain}
          chips={failChips}
        />
      )}

      {awaitingBossConfirm && modifiers && bossChapter !== null && (
        <BossGateSheet
          chapterNumber={bossChapter}
          modifiers={modifiers}
          backHref="/sudoku/chapters"
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

