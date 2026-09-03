import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import { WORD_LENGTH, WORDLE_RULES, type Difficulty, type WordleLevelRecord } from '../engine/wordle/types'
import { hardModeViolation, keyStatuses } from '../engine/wordle/validator'
import { createInitialState, revealableHintIndices, wordleReducer } from '../state/wordleReducer'
import {
  consumeConsumables,
  getDailyChallenge,
  getSettings,
  getWordleInProgress,
  getWordleProgress,
  recordFreePlayCompletion,
  recordWordleCompletion,
  saveWordleInProgress,
  spendCoins,
  type ConsumableKind,
  type WordleInProgressLevel,
} from '../storage/db'
import { getFreePlayWordleLevel, getNextWordleLevel, loadAnswerPool, loadGuessDictionary } from '../games/wordleLevels'
import { getDailyWordleLevel, todayDateKey } from '../games/dailyChallenge'
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
import { WordleBoard } from '../components/WordleBoard'
import { WordleKeyboard } from '../components/WordleKeyboard'
import { WordleControls } from '../components/WordleControls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'
import { WordleLoseSheet } from '../components/WordleLoseSheet'
import { BossGateSheet, buildBossAssists, TIME_FREEZE_BONUS_MS, type BossAssist } from '../components/BossGateSheet'
import { LevelContext } from '../components/LevelContext'
import { BoltIcon, EyeIcon } from '../components/icons'

const HINT_OPTIONS: HintOption[] = [
  { id: 'reveal-letter', icon: <EyeIcon />, title: 'Reveal a letter', desc: "Tells you one letter and its position.", price: 35 },
]

// First-guess placeholder, not derived from real solve-time data — tune once the user
// has actually played a few Timed boss levels.
const TIMED_BUDGET_MS = 60_000

const PLACEHOLDER_LEVEL: WordleLevelRecord = { id: 'placeholder', difficulty: 'easy', answer: 'aaaaa' }

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

// How long the invalid-guess shake plus its inline message stay up before clearing on
// their own — long enough to read, short enough not to still be there next guess.
const GUESS_ERROR_MS = 1400

interface ReplayLocationState {
  replayLevel?: WordleLevelRecord
  chapterReplay?: ChapterReplaySession
}

export default function WordleGamePage({ freePlay = false }: { freePlay?: boolean }) {
  const { difficulty } = useParams<{ difficulty: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isDaily = difficulty === 'daily'
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const { playSound, buzz } = useAudio()

  const [state, dispatch] = useReducer(wordleReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level, 6, false))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [dictionary, setDictionary] = useState<Set<string> | null>(null)
  const [hintsOpen, setHintsOpen] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const [guessError, setGuessError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [modifiers, setModifiers] = useState<LevelModifiers | null>(null)
  const [levelIndex, setLevelIndex] = useState<number | null>(null)
  // 'out-of-guesses' is deliberately not its own piece of state — it's just
  // state.status === 'lost' (see state/wordleReducer.ts), read directly below rather
  // than mirrored into an effect. 'timeout' is the one genuinely external event (a
  // Timed boss level's clock, via GameHeader's onTimerExpire), so it's the only reason
  // that needs real state here.
  const [timedOut, setTimedOut] = useState(false)
  const [awaitingBossConfirm, setAwaitingBossConfirm] = useState(false)
  const [bossChapter, setBossChapter] = useState<number | null>(null)
  const [assistOptions, setAssistOptions] = useState<BossAssist[]>([])
  const [selectedAssists, setSelectedAssists] = useState<Set<ConsumableKind>>(new Set())
  // Wordle has no live Undo (see Controls' backspaceDisabled below) and Perfect Run is
  // resolved at LOAD time (as a reduced attempts count) rather than watched mid-run, so
  // 'mistake' here only ever means "add one attempt back" — there's no forgiveness ref
  // to track since it's baked into the attempts count for the whole level up front.
  const [activeAssists, setActiveAssists] = useState({ undo: false, time: false, mistake: false })
  const pendingLoadRef = useRef<{
    inProgress: WordleInProgressLevel | undefined
    baseAttempts: number
    hardMode: boolean
    perfectRun: boolean
  } | null>(null)
  const sourceRef = useRef<{ source: 'bank' | 'generated'; bankIndex?: number }>({ source: 'generated' })
  const guessErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Set during load if today's Daily Challenge was already completed — the win effect
  // reads this to skip re-awarding coins on a replay (recordDailyChallengeCompletion
  // would otherwise let a player farm coins by re-solving the same puzzle all day).
  const dailyAlreadyCompletedRef = useRef(false)
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)
  const initialChapterReplayRef = useRef((location.state as ReplayLocationState | null)?.chapterReplay)

  useEffect(() => {
    let cancelled = false
    loadGuessDictionary().then((d) => !cancelled && setDictionary(d))
    return () => {
      cancelled = true
    }
  }, [])

  const finishLoad = useCallback(
    async (inProgress: WordleInProgressLevel | undefined, attempts: number, hardMode: boolean) => {
      if (inProgress) {
        sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
        dispatch({
          type: 'LOAD',
          level: inProgress.level,
          attempts,
          hardMode,
          snapshot: {
            guesses: inProgress.guesses,
            currentGuess: inProgress.currentGuess,
            elapsedMs: inProgress.elapsedMs,
            hintedIndices: inProgress.hintedIndices,
            hintsUsed: inProgress.hintsUsed,
          },
        })
        return
      }
      const next = await getNextWordleLevel(validDifficulty as Difficulty)
      sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
      dispatch({ type: 'LOAD', level: next.level, attempts, hardMode })
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
      const mistakeUsed = applied.includes('mistakeSave')
      setActiveAssists({ undo: applied.includes('undoToken'), time: applied.includes('timeFreeze'), mistake: mistakeUsed })
      const attempts = pending.perfectRun && mistakeUsed ? pending.baseAttempts + 1 : pending.baseAttempts
      await finishLoad(pending.inProgress, attempts, pending.hardMode)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [finishLoad, selectedAssists])

  // Load the in-progress save for this difficulty if one exists, else the next level.
  // The 'daily' route (/wordle/daily) shares this same param slot: it skips bank/resume
  // entirely and always loads today's deterministic word (or replays it, via the same
  // replayLevel mechanism used for post-completion replays, if today's is already solved).
  useEffect(() => {
    if (!validDifficulty && !isDaily) return
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      setModifiers(null)
      setLevelIndex(null)
      setTimedOut(false)
      setAwaitingBossConfirm(false)
      setAssistOptions([])
      setSelectedAssists(new Set())
      setActiveAssists({ undo: false, time: false, mistake: false })
      try {
        const chapterReplay = initialChapterReplayRef.current
        if (chapterReplay) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'bank' }
          const rules = WORDLE_RULES[validDifficulty as Difficulty]
          dispatch({
            type: 'LOAD',
            level: chapterReplay.levels[chapterReplay.index] as WordleLevelRecord,
            attempts: rules.attempts,
            hardMode: rules.hardMode,
          })
          return
        }

        const replayLevel = initialReplayLevelRef.current
        if (replayLevel) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'generated' }
          const rules = isDaily ? WORDLE_RULES.medium : WORDLE_RULES[validDifficulty as Difficulty]
          dispatch({ type: 'LOAD', level: replayLevel, attempts: rules.attempts, hardMode: rules.hardMode })
          return
        }

        if (isDaily) {
          const dateKey = todayDateKey()
          const [pool, settings, existing] = await Promise.all([loadAnswerPool(), getSettings(), getDailyChallenge(dateKey, 'wordle')])
          if (cancelled) return
          setCoins(settings.coins)
          sourceRef.current = { source: 'generated' }
          dailyAlreadyCompletedRef.current = !!existing
          const level = getDailyWordleLevel(dateKey, pool)
          dispatch({ type: 'LOAD', level, attempts: WORDLE_RULES.medium.attempts, hardMode: WORDLE_RULES.medium.hardMode })
          return
        }

        // Free Play: always a fresh random word, no bank/currentLevelIndex, no resume,
        // no boss gate — entirely separate from the chapter system below.
        if (freePlay) {
          const settings = await getSettings()
          if (cancelled) return
          setCoins(settings.coins)
          const next = await getFreePlayWordleLevel(validDifficulty as Difficulty)
          sourceRef.current = { source: next.source }
          const rules = WORDLE_RULES[validDifficulty as Difficulty]
          dispatch({ type: 'LOAD', level: next.level, attempts: rules.attempts, hardMode: rules.hardMode })
          return
        }

        const [settings, inProgress, progress] = await Promise.all([
          getSettings(),
          getWordleInProgress(validDifficulty as Difficulty),
          getWordleProgress(validDifficulty as Difficulty),
        ])
        if (cancelled) return
        setCoins(settings.coins)
        setLevelIndex(progress.currentLevelIndex)
        const rules = WORDLE_RULES[validDifficulty as Difficulty]
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
        // Perfect Run has no separate "one mistake ends it" watcher here (unlike the
        // grid games) — for Wordle it's simplest and just as true to the modifier's
        // intent to cap the run at a single guess: anything but the answer itself
        // exhausts the attempt limit and ends the run via the reducer's own status
        // check, same as running out of guesses normally.
        const baseAttempts = levelModifiers?.perfectRun ? 1 : rules.attempts

        if (levelModifiers) {
          pendingLoadRef.current = { inProgress, baseAttempts, hardMode: rules.hardMode, perfectRun: !!levelModifiers.perfectRun }
          setAssistOptions(buildBossAssists(levelModifiers, settings))
          setAwaitingBossConfirm(true)
          return
        }

        await finishLoad(inProgress, baseAttempts, rules.hardMode)
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

  useGameLifecycle(loading, error, state.status, dispatch)

  // Autosave in-progress state so leaving and returning resumes this exact run. Daily
  // Challenge intentionally skips this (see src/games/dailyChallenge.ts) — it always
  // restarts fresh from the same deterministic word within a day. Free Play skips it
  // too — every visit is meant to generate a brand new word, not resume.
  useEffect(() => {
    if (loading || !validDifficulty || isDaily || freePlay || initialChapterReplayRef.current || state.status !== 'playing') return
    saveWordleInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      guesses: state.guesses,
      currentGuess: state.currentGuess,
      hintedIndices: state.hintedIndices,
      hintsUsed: state.hintsUsed,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [
    state.guesses,
    state.currentGuess,
    state.elapsedMs,
    state.level,
    state.status,
    state.hintedIndices,
    state.hintsUsed,
    loading,
    validDifficulty,
    isDaily,
    freePlay,
  ])

  useGameCompletion({
    gameId: 'wordle',
    basePath: '/wordle',
    status: state.status,
    isDaily,
    isFreePlay: freePlay,
    chapterReplay: initialChapterReplayRef.current ?? null,
    validDifficulty,
    elapsedMs: state.elapsedMs,
    hintsUsed: state.hintsUsed,
    dailyGuessCount: state.guesses.length,
    level: state.level,
    extraKey: 'guesses',
    extraValue: state.guesses,
    dailyAlreadyCompletedRef,
    recordCompletion: recordWordleCompletion,
    recordFreePlayCompletion,
  })

  // 'out-of-guesses' whenever the reducer itself has already settled on 'lost' (it
  // also freezes the timer there — see withStatusCheck in state/wordleReducer.ts);
  // 'timeout' only while a Timed boss level's clock has run out first. Derived every
  // render rather than mirrored into state — see the timedOut comment above.
  const failedReason: 'timeout' | 'out-of-guesses' | null = timedOut ? 'timeout' : state.status === 'lost' ? 'out-of-guesses' : null

  const handleTryAgain = useCallback(async () => {
    setTimedOut(false)
    setLoading(true)
    try {
      if (isDaily) {
        const dateKey = todayDateKey()
        const pool = await loadAnswerPool()
        sourceRef.current = { source: 'generated' }
        const level = getDailyWordleLevel(dateKey, pool)
        dispatch({ type: 'LOAD', level, attempts: WORDLE_RULES.medium.attempts, hardMode: WORDLE_RULES.medium.hardMode })
        return
      }
      if (!validDifficulty) return
      const rules = WORDLE_RULES[validDifficulty]
      if (freePlay) {
        const next = await getFreePlayWordleLevel(validDifficulty)
        sourceRef.current = { source: next.source }
        dispatch({ type: 'LOAD', level: next.level, attempts: rules.attempts, hardMode: rules.hardMode })
        return
      }
      const next = await getNextWordleLevel(validDifficulty)
      sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
      const baseAttempts = modifiers?.perfectRun ? 1 : rules.attempts
      const attempts = modifiers?.perfectRun && activeAssists.mistake ? baseAttempts + 1 : baseAttempts
      dispatch({ type: 'LOAD', level: next.level, attempts, hardMode: rules.hardMode })
    } finally {
      setLoading(false)
    }
  }, [isDaily, validDifficulty, freePlay, modifiers, activeAssists.mistake])

  const flashGuessError = useCallback((message: string) => {
    playSound('error')
    buzz(15)
    setGuessError(message)
    setShake(true)
    if (guessErrorTimeoutRef.current) clearTimeout(guessErrorTimeoutRef.current)
    guessErrorTimeoutRef.current = setTimeout(() => {
      setGuessError(null)
      setShake(false)
    }, GUESS_ERROR_MS)
  }, [playSound, buzz])

  const clearGuessError = useCallback(() => {
    if (!guessError && !shake) return
    if (guessErrorTimeoutRef.current) clearTimeout(guessErrorTimeoutRef.current)
    setGuessError(null)
    setShake(false)
  }, [guessError, shake])

  const handleLetter = useCallback(
    (letter: string) => {
      if (failedReason || state.status !== 'playing') return
      clearGuessError()
      playSound('tap')
      buzz(10)
      dispatch({ type: 'TYPE_LETTER', letter })
    },
    [failedReason, state.status, clearGuessError, playSound, buzz],
  )

  const handleBackspace = useCallback(() => {
    if (failedReason || state.status !== 'playing') return
    clearGuessError()
    dispatch({ type: 'BACKSPACE' })
  }, [failedReason, state.status, clearGuessError])

  const handleSubmit = useCallback(() => {
    if (failedReason || state.status !== 'playing' || !dictionary) return
    if (state.currentGuess.length !== WORD_LENGTH) {
      flashGuessError('Not enough letters')
      return
    }
    if (!dictionary.has(state.currentGuess)) {
      flashGuessError('Not in word list')
      return
    }
    if (state.hardMode) {
      const violation = hardModeViolation(state.guesses, state.currentGuess)
      if (violation) {
        flashGuessError(violation)
        return
      }
    }
    playSound('tap')
    buzz(15)
    dispatch({ type: 'SUBMIT_GUESS', now: Date.now() })
  }, [failedReason, state.status, state.currentGuess, state.hardMode, state.guesses, dictionary, flashGuessError, playSound, buzz])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (/^[a-zA-Z]$/.test(e.key)) handleLetter(e.key.toLowerCase())
      else if (e.key === 'Backspace') handleBackspace()
      else if (e.key === 'Enter') handleSubmit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleLetter, handleBackspace, handleSubmit])

  const handleUseHint = useCallback(
    async (id: string, price: number) => {
      if (id !== 'reveal-letter') return
      const options = revealableHintIndices(state)
      if (options.length === 0) {
        setCheckMessage("You've already revealed every letter.")
        return
      }
      const ok = await spendCoins(price)
      if (!ok) return
      setCoins((c) => c - price)
      playSound('hint')
      const index = options[Math.floor(Math.random() * options.length)]
      const letter = state.level.answer[index].toUpperCase()
      setCheckMessage(`Letter ${index + 1} is "${letter}".`)
      dispatch({ type: 'HINT_REVEAL_LETTER', index, now: Date.now() })
      setHintsOpen(false)
    },
    [state, playSound],
  )

  const statuses = useMemo(() => keyStatuses(state.guesses), [state.guesses])
  const attemptsLeft = Math.max(0, state.attempts - state.guesses.length)

  if (!validDifficulty && !isDaily) {
    return <ErrorScreen message="Unknown difficulty." onBack={() => navigate('/wordle')} />
  }
  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/wordle')} />
  }

  return (
    <main
      data-game="wordle"
      className="mx-auto flex min-h-svh max-w-lg flex-col items-center gap-6 bg-bg px-4 py-[max(1.5rem,env(safe-area-inset-top))] text-ink"
    >
      <GameHeader
        elapsedMs={state.elapsedMs}
        runStartedAt={state.runStartedAt}
        coins={coins}
        timerKey={state.level.id}
        budgetMs={modifiers?.timed ? TIMED_BUDGET_MS + (activeAssists.time ? TIME_FREEZE_BONUS_MS : 0) : undefined}
        onTimerExpire={() => {
          dispatch({ type: 'PAUSE', now: Date.now() })
          setTimedOut(true)
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

        {state.hardMode && !modifiers && (
          <p className="w-full rounded-2xl bg-accent-tint px-4 py-2 text-center text-[12px] font-semibold text-accent">Hard mode</p>
        )}

        {guessError && (
          <p role="alert" className="w-full rounded-2xl bg-danger/10 px-4 py-2 text-center text-[13px] font-semibold text-danger">
            {guessError}
          </p>
        )}

        {loading ? (
          <p className="text-ink-muted">Loading word…</p>
        ) : (
          <>
            <WordleBoard attempts={state.attempts} guesses={state.guesses} currentGuess={state.currentGuess} shake={shake} />
            <WordleKeyboard
              statuses={statuses}
              onLetter={handleLetter}
              onEnter={handleSubmit}
              onBackspace={handleBackspace}
              disabled={state.status !== 'playing' || !!failedReason}
              backspaceDisabled={modifiers?.noUndo && !activeAssists.undo}
            />
          </>
        )}

        <WordleControls
          attemptsLeft={attemptsLeft}
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

      {failedReason && (
        <WordleLoseSheet
          reason={failedReason}
          answer={state.level.answer}
          chaptersHref={isDaily ? '/' : freePlay ? '/wordle/chapters?tab=free' : '/wordle/chapters'}
          chaptersLabel={isDaily ? 'Back to Home' : freePlay ? 'Back to Free Play' : undefined}
          onTryAgain={handleTryAgain}
        />
      )}

      {awaitingBossConfirm && modifiers && bossChapter !== null && (
        <BossGateSheet
          chapterNumber={bossChapter}
          modifiers={modifiers}
          backHref="/wordle/chapters"
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
