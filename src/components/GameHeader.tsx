import { useEffect, useState, type ReactNode } from 'react'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import { Timer } from './Timer'
import { CoinBalance } from './CoinBalance'
import { ChevronLeftIcon, ZenIcon } from './icons'
import { getSettings } from '../storage/db'

interface GameHeaderProps {
  elapsedMs: number
  runStartedAt: number | null
  coins: number
  /** Overrides the default coin-balance pill in the right slot — Queens uses this for
   *  its Auto-X badge instead. */
  right?: ReactNode
  /** Remounts the Timer on every fresh level (e.g. the level's id) so its internal
   *  expired-flag resets cleanly across LOAD, including a Timed boss level's retry. */
  timerKey?: string
  /** Set only for a Timed boss level — see games/chapters.ts. Deliberately has no
   *  effect while zenMode is on: the Timer (and so the countdown) isn't rendered at
   *  all in that branch below, which already keeps Timed levels time-pressure-free for
   *  zenMode players without any extra gating here. */
  budgetMs?: number
  onTimerExpire?: () => void
}

export function GameHeader({ elapsedMs, runStartedAt, coins, right, timerKey, budgetMs, onTimerExpire }: GameHeaderProps) {
  const navigate = useNavigate()
  const [zenMode, setZenMode] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => !cancelled && setZenMode(s.zenMode))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex w-full items-center justify-between">
      <button
        type="button"
        // History-back, not a fixed route: a level is reached either from its Chapters
        // map or from Free Play's difficulty picker, and every level transition
        // (Next level, Replay, chapter-complete) navigates with `replace: true`, so the
        // history entry right below the current level is always wherever the player
        // actually came from.
        onClick={() => navigate(-1)}
        aria-label="Back"
        className="inline-flex size-11 items-center justify-center rounded-full bg-accent-tint text-accent"
      >
        <ChevronLeftIcon />
      </button>
      {zenMode ? (
        <span className="flex items-center gap-1.5 rounded-full bg-accent-tint px-3 py-1.5 text-xs font-semibold text-accent">
          <ZenIcon />
          Zen mode
        </span>
      ) : (
        <Timer key={timerKey} elapsedMs={elapsedMs} runStartedAt={runStartedAt} budgetMs={budgetMs} onExpire={onTimerExpire} />
      )}
      {right ?? <CoinBalance amount={coins} />}
    </div>
  )
}
