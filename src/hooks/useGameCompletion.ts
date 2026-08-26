import { useEffect, type MutableRefObject } from 'react'
import { useAppNavigate as useNavigate } from './useAppNavigate'
import { useAudio } from './useAudio'
import { useReducedMotion } from './useReducedMotion'
import { getDailyStreak, recordDailyChallengeCompletion, type CompletionResult } from '../storage/db'
import type { Difficulty } from '../engine/types'
import type { DailyGameId } from '../games/dailyChallenge'

interface UseGameCompletionOptions<K extends string, V> {
  gameId: DailyGameId
  /** Route prefix for this game, e.g. '/queens' — completion navigates to
   *  `${basePath}/${difficulty}/complete` or `${basePath}/daily/complete`. */
  basePath: string
  status: string
  isDaily: boolean
  validDifficulty: Difficulty | null
  elapsedMs: number
  hintsUsed: number
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
  validDifficulty,
  elapsedMs,
  hintsUsed,
  level,
  extraKey,
  extraValue,
  dailyAlreadyCompletedRef,
  recordCompletion,
}: UseGameCompletionOptions<K, V>) {
  const navigate = useNavigate()
  const { playSound, buzz } = useAudio()
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
      const finish = dailyAlreadyCompletedRef.current
        ? getDailyStreak(gameId).then((streak) => ({ coinsAwarded: 0, streak }))
        : recordDailyChallengeCompletion(gameId, elapsedMs, hintsUsed > 0)
      finish.then((result) => {
        if (cancelled) return
        scheduleNavigate(`${basePath}/daily/complete`, {
          timeMs: elapsedMs,
          level,
          [extraKey]: extraValue,
          coinsAwarded: result.coinsAwarded,
          dailyStreak: result.streak,
        })
      })
    } else {
      recordCompletion(validDifficulty as Difficulty, elapsedMs, hintsUsed > 0).then((result) => {
        if (cancelled) return
        scheduleNavigate(`${basePath}/${validDifficulty}/complete`, {
          timeMs: elapsedMs,
          levelNumber: result.progress.completedCount,
          level,
          [extraKey]: extraValue,
          coinsAwarded: result.coinsAwarded,
          isPersonalBest: result.isPersonalBest,
          dailyBonusApplied: result.dailyBonusApplied,
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
  }, [status, validDifficulty, isDaily, navigate, elapsedMs, level, extraValue])
}
