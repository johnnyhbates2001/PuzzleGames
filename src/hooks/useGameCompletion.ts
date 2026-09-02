import { useEffect, type MutableRefObject } from 'react'
import { useAppNavigate as useNavigate } from './useAppNavigate'
import { useAudio } from './useAudio'
import { useAuth } from './useAuth'
import { useReducedMotion } from './useReducedMotion'
import {
  getDailyStreak,
  grantSkin,
  recordDailyChallengeCompletion,
  type CompletionResult,
  type FreePlayCompletionResult,
} from '../storage/db'
import { postDailyScore, postGameScore } from '../api/scores'
import type { Difficulty } from '../engine/types'
import { todayDateKey, type DailyGameId } from '../games/dailyChallenge'
import { CHAPTER_META, LEVELS_PER_CHAPTER, chapterForIndex, storyLevelsForTier } from '../games/chapters'

export interface ChapterCompleteInfo {
  chapterNumber: number
  chapterName: string
  skinUnlocked?: string
}

/** If `currentLevelIndex` (the count of completed levels, post-increment) just crossed a
 *  chapter boundary within the story range, derives that chapter and grants its reward
 *  skin (if any) — idempotent via grantSkin, so re-crossing (shouldn't happen; the
 *  counter only grows) never double-grants. Returns undefined once past the story's 200
 *  levels/tier (Endless territory), where chapter boundaries are no longer meaningful. */
async function checkChapterComplete(
  currentLevelIndex: number,
  difficulty: Difficulty,
): Promise<ChapterCompleteInfo | undefined> {
  if (currentLevelIndex > storyLevelsForTier(difficulty) || currentLevelIndex % LEVELS_PER_CHAPTER !== 0) return undefined
  const { chapterNumber } = chapterForIndex(currentLevelIndex - 1, difficulty)
  const meta = CHAPTER_META[chapterNumber - 1]
  if (!meta) return undefined
  if (meta.skinId) await grantSkin(meta.skinId)
  return { chapterNumber, chapterName: meta.name, skinUnlocked: meta.skinId }
}

export interface ChapterReplaySession {
  chapterNumber: number
  chapterName: string
  /** Always 20 — every story chapter is fully bank-sourced (see games/chapters.ts). */
  levels: unknown[]
  /** Which level of `levels` the current GamePage mount is playing. */
  index: number
}

interface UseGameCompletionOptions<K extends string, V> {
  gameId: DailyGameId
  /** Route prefix for this game, e.g. '/queens' — completion navigates to
   *  `${basePath}/${difficulty}/complete` or `${basePath}/daily/complete`. */
  basePath: string
  status: string
  isDaily: boolean
  /** True for a Free Play run — see games/*Levels.ts's getFreePlayLevel and
   *  storage/db.ts's recordFreePlayCompletion. Entirely separate from the chapter
   *  system: never advances currentLevelIndex, so it can't move a chapter, the bank
   *  pointer, or Endless rank. */
  isFreePlay: boolean
  /** Set for a "replay this chapter" session (see ChaptersPage.tsx's CompleteRow) —
   *  routes rewards through the same recordFreePlayCompletion path Free Play uses
   *  (coins + streak credit, never touches currentLevelIndex/completedCount/
   *  bestTimeMs or skin-unlock logic) but keeps navigating through the normal
   *  complete route, carrying the session forward until all 20 levels are done. */
  chapterReplay: ChapterReplaySession | null
  validDifficulty: Difficulty | null
  elapsedMs: number
  hintsUsed: number
  /** Wordle only — see storage/db.ts's DailyChallengeRecord.guessCount and
   *  worker/routes/scores.ts, which scores the Wordle daily leaderboard by guesses
   *  instead of elapsed time. */
  dailyGuessCount?: number
  level: unknown
  /** The one extra piece of board state each game's complete screen needs to render
   *  its preview — 'board' for Queens/Sudoku, 'path' for Zip, 'placed' for Patches,
   *  'grid' for Nonogram — carried into the complete page's location.state under
   *  this key. */
  extraKey: K
  extraValue: V
  /** Set during load if today's Daily Challenge was already completed — skips
   *  re-awarding coins on a replay (recordDailyChallengeCompletion would otherwise
   *  let a player farm coins by re-solving the same puzzle all day). */
  dailyAlreadyCompletedRef: MutableRefObject<boolean>
  recordCompletion: (difficulty: Difficulty, elapsedMs: number, assisted: boolean) => Promise<CompletionResult>
  /** Only called when isFreePlay — keeps Free Play completions out of recordCompletion
   *  entirely, rather than branching inside one shared call. */
  recordFreePlayCompletion: (difficulty: Difficulty, elapsedMs: number, assisted: boolean) => Promise<FreePlayCompletionResult>
}

/** How long the board's solve-sweep gets to play (see each Board's `solved` prop)
 *  before we navigate away — not the sweep's full duration (which runs longer on
 *  bigger grids), just enough that the sweep's tail overlaps the complete screen's
 *  sheet rise instead of the cut feeling abrupt. */
const SWEEP_NAVIGATE_DELAY_MS = 900

/** Shared by every Game*Page's win effect: on reaching 'won', plays the success cue
 *  immediately, records the completion (or the Daily Challenge equivalent) right
 *  away too, then — once that write settles — holds briefly for the board's solve
 *  sweep to play before handing off to the matching complete screen. */
export function useGameCompletion<K extends string, V>({
  gameId,
  basePath,
  status,
  isDaily,
  isFreePlay,
  chapterReplay,
  validDifficulty,
  elapsedMs,
  hintsUsed,
  dailyGuessCount,
  level,
  extraKey,
  extraValue,
  dailyAlreadyCompletedRef,
  recordCompletion,
  recordFreePlayCompletion,
}: UseGameCompletionOptions<K, V>) {
  const navigate = useNavigate()
  const { playSound, buzz } = useAudio()
  const { user } = useAuth()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (status !== 'won' || (!validDifficulty && !isDaily)) return
    let cancelled = false
    let navigateTimeoutId: ReturnType<typeof setTimeout> | undefined
    playSound('success')
    buzz([20, 40, 20, 40, 60])

    function scheduleNavigate(path: string, state: Record<string, unknown>) {
      const delayMs = reducedMotion ? 0 : SWEEP_NAVIGATE_DELAY_MS
      navigateTimeoutId = setTimeout(() => {
        if (!cancelled) navigate(path, { state, replace: true })
      }, delayMs)
    }

    if (isDaily) {
      const alreadyCompletedToday = dailyAlreadyCompletedRef.current
      const finish = alreadyCompletedToday
        ? getDailyStreak(gameId).then((streak) => ({ coinsAwarded: 0, streak }))
        : recordDailyChallengeCompletion(gameId, elapsedMs, hintsUsed > 0, dailyGuessCount)
      finish.then((result) => {
        if (cancelled) return
        // Only the real first-completion-of-the-day is worth syncing — a replay of an
        // already-completed daily shouldn't overwrite that day's leaderboard row with a
        // second, possibly worse, attempt (see recordDailyChallengeCompletion's own
        // no-double-award guard for the same reasoning).
        if (user && !alreadyCompletedToday) {
          void postDailyScore({
            gameId,
            dateKey: todayDateKey(),
            elapsedMs: gameId === 'wordle' ? undefined : elapsedMs,
            guesses: gameId === 'wordle' ? dailyGuessCount : undefined,
            assisted: hintsUsed > 0,
          }).catch((error: unknown) => console.error('Daily score sync failed', error))
        }
        scheduleNavigate(`${basePath}/daily/complete`, {
          timeMs: elapsedMs,
          level,
          [extraKey]: extraValue,
          coinsAwarded: result.coinsAwarded,
          dailyStreak: result.streak,
        })
      })
    } else if (chapterReplay) {
      recordFreePlayCompletion(validDifficulty as Difficulty, elapsedMs, hintsUsed > 0).then((result) => {
        if (cancelled) return
        const nextIndex = chapterReplay.index + 1
        // Same route a normal completion uses (not Free Play's separate route) —
        // chapterReplay in the nav state is what tells CompletePage this was a
        // replay run, no URL distinction needed. CompletePage fetches the streak
        // itself client-side (same as bestMs) rather than threading it through here.
        scheduleNavigate(`${basePath}/${validDifficulty}/complete`, {
          timeMs: elapsedMs,
          level,
          [extraKey]: extraValue,
          coinsAwarded: result.coinsAwarded,
          chapterReplay: { ...chapterReplay, index: nextIndex },
          sessionDone: nextIndex >= chapterReplay.levels.length,
        })
      })
    } else if (isFreePlay) {
      recordFreePlayCompletion(validDifficulty as Difficulty, elapsedMs, hintsUsed > 0).then((result) => {
        if (cancelled) return
        scheduleNavigate(`${basePath}/free/${validDifficulty}/complete`, {
          timeMs: elapsedMs,
          level,
          [extraKey]: extraValue,
          coinsAwarded: result.coinsAwarded,
        })
      })
    } else {
      recordCompletion(validDifficulty as Difficulty, elapsedMs, hintsUsed > 0).then(async (result) => {
        if (cancelled) return
        const chapterComplete = await checkChapterComplete(result.progress.currentLevelIndex, validDifficulty as Difficulty)
        if (cancelled) return
        if (user) {
          void postGameScore({
            gameId,
            difficulty: validDifficulty as Difficulty,
            completedCount: result.progress.completedCount,
            bestTimeMs: result.progress.bestTimeMs,
            totalTimeMs: result.progress.totalTimeMs,
          }).catch((error: unknown) => console.error('Game score sync failed', error))
        }
        scheduleNavigate(`${basePath}/${validDifficulty}/complete`, {
          timeMs: elapsedMs,
          levelNumber: result.progress.completedCount,
          level,
          [extraKey]: extraValue,
          coinsAwarded: result.coinsAwarded,
          isPersonalBest: result.isPersonalBest,
          dailyBonusApplied: result.dailyBonusApplied,
          chapterComplete,
        })
      })
    }
    return () => {
      cancelled = true
      if (navigateTimeoutId !== undefined) clearTimeout(navigateTimeoutId)
    }
    // playSound/buzz/hintsUsed/reducedMotion intentionally omitted — this effect
    // fires once per win (a fresh Game*Page mount always precedes the next 'won'
    // status), so reacting to unrelated re-renders of those would be wrong, not
    // just redundant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, validDifficulty, isDaily, isFreePlay, chapterReplay, navigate, elapsedMs, level, extraValue])
}
