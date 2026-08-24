import type { ReactNode } from 'react'
import { AppLink as Link } from './AppLink'
import { useEffect } from 'react'
import { formatElapsed } from './Timer'
import { useAudio } from '../hooks/useAudio'
import { Confetti } from './Confetti'

interface CompleteSheetProps {
  /** The blurred, absolutely-positioned board preview — differs per game (Board /
   *  SudokuBoard / ZipBoard / PatchesBoard), so the caller renders it. */
  boardPreview: ReactNode
  difficultyLabel: string
  /** Omitted for the Daily Challenge, which has no bank-position level number. */
  levelNumber?: number
  timeMs: number
  bestMs: number | null
  avgMs: number | null
  coinsAwarded: number
  isPersonalBest: boolean
  /** True the first time any game is solved on a given calendar day — see
   *  ShopPage's "Daily bonus" copy and storage/db.ts's finishCompletion. */
  dailyBonusApplied?: boolean
  /** True when this sheet is for the featured Daily Challenge puzzle rather than a
   *  regular difficulty run — swaps the Best/Average tile for the daily streak. */
  isDaily?: boolean
  dailyStreak?: number
  onNextLevel: () => void
  onReplay: () => void
}

export function CompleteSheet({
  boardPreview,
  difficultyLabel,
  levelNumber,
  timeMs,
  bestMs,
  avgMs,
  coinsAwarded,
  isPersonalBest,
  dailyBonusApplied,
  isDaily,
  dailyStreak,
  onNextLevel,
  onReplay,
}: CompleteSheetProps) {
  const { playSound } = useAudio()
  useEffect(() => {
    if (coinsAwarded > 0) playSound('coin')
    // Fires once per mount (a completion screen is a fresh mount every time), not on
    // every re-render — deliberately omits playSound from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      {boardPreview}
      <Confetti />
      <div className="absolute inset-0 bg-ink/32" />

      <div className="anim-sheet-up absolute inset-x-4 bottom-0 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-t-[32px] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-card">
        <span
          className="anim-pop-in absolute -top-8 flex size-16 items-center justify-center rounded-full border-4 border-surface bg-accent text-2xl font-bold text-white"
          style={{ animationDelay: '80ms', animationFillMode: 'both' }}
        >
          ✓
        </span>

        <div className="mt-4">
          <h1 className="font-display text-[23px] font-extrabold text-ink">Solved</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {difficultyLabel}
            {levelNumber != null ? ` · Level ${levelNumber}` : ''}
          </p>
        </div>

        <p className="font-mono text-[52px] font-extrabold leading-none tabular-nums text-ink">{formatElapsed(timeMs)}</p>

        {coinsAwarded > 0 && (
          <div className="flex items-center gap-2 rounded-full border-[1.5px] border-[oklch(85%_0.08_85)] bg-[oklch(96%_0.03_85)] py-2 pr-4 pl-3">
            <span className="size-5 rounded-full border-2 border-[oklch(68%_0.15_75)] bg-[oklch(80%_0.14_85)] box-border" />
            <span className="text-[15px] font-extrabold text-[oklch(45%_0.11_75)]">+{coinsAwarded} coins</span>
            {isPersonalBest && <span className="text-xs font-semibold text-[oklch(55%_0.08_75)]">personal best</span>}
            {dailyBonusApplied && <span className="text-xs font-semibold text-[oklch(55%_0.08_75)]">🔥 daily bonus ×2</span>}
          </div>
        )}

        {isDaily ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-tint py-3.5">
            <span className="text-lg">🔥</span>
            <span className="text-[15px] font-bold text-ink">{dailyStreak ?? 0} day streak</span>
          </div>
        ) : (
          <div className="flex w-full rounded-2xl bg-accent-tint py-3">
            <div className="flex flex-1 flex-col items-center gap-0.5">
              <span className="font-mono text-[15px] font-bold text-accent">
                {bestMs !== null ? formatElapsed(bestMs) : '—'}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Best</span>
            </div>
            <div className="flex flex-1 flex-col items-center gap-0.5">
              <span className="font-mono text-[15px] font-bold text-ink">
                {avgMs !== null ? formatElapsed(avgMs) : '—'}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Average</span>
            </div>
          </div>
        )}

        <div className="flex w-full flex-col gap-2">
          {!isDaily && (
            <button type="button" onClick={onNextLevel} className="w-full rounded-full bg-accent py-3 font-semibold text-white">
              Next level
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onReplay} className="flex-1 rounded-full bg-bg py-3 font-semibold text-ink-muted">
              Replay
            </button>
            <Link to="/" className="flex-1 rounded-full bg-bg py-3 font-semibold text-ink-muted">
              Home
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
