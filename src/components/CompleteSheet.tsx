import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AppLink as Link } from './AppLink'
import { formatElapsed } from './Timer'
import { useAudio } from '../hooks/useAudio'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getSettings } from '../storage/db'
import { getSkin } from '../skins'
import { Confetti } from './Confetti'
import type { ChapterCompleteInfo } from '../hooks/useGameCompletion'

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
  /** Set when this completion also crossed a chapter boundary — see useGameCompletion. */
  chapterComplete?: ChapterCompleteInfo
  onNextLevel: () => void
  onReplay: () => void
}

// Coin flight + balance count-up timings — see the header CoinBalance pill and the
// reward pill's own coin dot, which the flight measures between. FLIGHT_START_MS
// mirrors the reward pill's own cascade delay (see the anim-rise below) so coins
// never appear to fly from a pill that hasn't visually landed yet.
const FLIGHT_START_MS = 380
const FLIGHT_DURATION_MS = 620
const FLIGHT_STAGGER_MS = 55
const COIN_COUNT = 5
const COUNT_UP_START_MS = FLIGHT_START_MS + FLIGHT_DURATION_MS
const COUNT_UP_DURATION_MS = 480
const BUMP_DELAY_MS = FLIGHT_START_MS + 760

// Personal headlines show up only PERSONAL_CHANCE of the time so they read as an
// occasional treat rather than showing up every single completion.
const PERSONAL_CHANCE = 0.2 // 1 in 5
const PLAIN_HEADLINES = ['Solved', 'Solved', 'Solved', 'Solved', 'Genius', 'Too easy', 'Uncorked 🍷', 'Prelako 😏']
const PERSONAL_HEADLINES = [
  'Solved, dušo',
  'Solved ❤️',
  'Bravo, ljubavi',
  'Moja genijalka',
  'Uspjela si',
  'Bravo, zlato ✨',
  'Svaka čast, ljubavi',
  'To je moja cura! 💗',
  'Pametnica 🧠',
  'Znao sam da možeš ❤️',
  'Moja pametna cura',
  'Najbolja si ❤️',
  'Riješeno, lijepa',
  'Svaka čast, ljube',
]

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

interface Flight {
  dx: number
  dy: number
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
  chapterComplete,
  onNextLevel,
  onReplay,
}: CompleteSheetProps) {
  const { playSound } = useAudio()
  const reducedMotion = useReducedMotion()
  const [headline] = useState(() => {
    const pool = Math.random() < PERSONAL_CHANCE ? PERSONAL_HEADLINES : PLAIN_HEADLINES
    return pool[Math.floor(Math.random() * pool.length)]
  })

  const rewardCoinRef = useRef<HTMLSpanElement>(null)
  const balanceRef = useRef<HTMLDivElement>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [displayBalance, setDisplayBalance] = useState<number | null>(null)
  const [zenMode, setZenMode] = useState(false)
  const [bump, setBump] = useState(false)
  const [flightOrigin, setFlightOrigin] = useState<{ left: number; top: number } | null>(null)
  const [flights, setFlights] = useState<Flight[] | null>(null)

  useEffect(() => {
    if (coinsAwarded > 0) playSound('coin')
    // Fires once per mount (a completion screen is a fresh mount every time), not on
    // every re-render — deliberately omits playSound from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The header balance pill needs the player's real total to animate toward — by the
  // time this screen mounts, recordCompletion has already written coinsAwarded into
  // it (see useGameCompletion), so this fetch already reflects the post-award total;
  // the pre-award "start" value below is simply that total minus the award.
  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => {
      if (cancelled) return
      setBalance(s.coins)
      setZenMode(s.zenMode)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (balance === null || coinsAwarded <= 0) return
    const target = balance
    const start = balance - coinsAwarded
    setDisplayBalance(start)

    if (reducedMotion) {
      setDisplayBalance(target)
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    let countUpInterval: ReturnType<typeof setInterval> | undefined

    // Measured once, at the moment the coins actually start flying — any earlier and
    // the reward pill (the flight's source) may still be mid-entrance.
    timers.push(
      setTimeout(() => {
        const fromEl = rewardCoinRef.current
        const toEl = balanceRef.current
        if (!fromEl || !toEl) return
        const from = fromEl.getBoundingClientRect()
        const to = toEl.getBoundingClientRect()
        setFlightOrigin({ left: from.left + from.width / 2, top: from.top + from.height / 2 })
        setFlights(
          Array.from({ length: COIN_COUNT }, () => ({
            dx: to.left + to.width / 2 - (from.left + from.width / 2) + (Math.random() - 0.5) * 20,
            dy: to.top + to.height / 2 - (from.top + from.height / 2) + (Math.random() - 0.5) * 16,
          })),
        )
      }, FLIGHT_START_MS),
    )

    timers.push(setTimeout(() => setBump(true), BUMP_DELAY_MS))
    timers.push(setTimeout(() => setBump(false), BUMP_DELAY_MS + 400))

    timers.push(
      setTimeout(() => {
        const startedAt = Date.now()
        countUpInterval = setInterval(() => {
          const t = Math.min(1, (Date.now() - startedAt) / COUNT_UP_DURATION_MS)
          setDisplayBalance(Math.round(start + (target - start) * easeOutCubic(t)))
          if (t >= 1 && countUpInterval) clearInterval(countUpInterval)
        }, 16)
      }, COUNT_UP_START_MS),
    )

    return () => {
      timers.forEach(clearTimeout)
      if (countUpInterval) clearInterval(countUpInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance, coinsAwarded, reducedMotion])

  return (
    <>
      {boardPreview}
      <Confetti />
      <div className="absolute inset-0 bg-ink/32" />

      {flightOrigin &&
        flights?.map((f, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="anim-coin-fly pointer-events-none fixed z-60 size-3 rounded-full border-2 border-[oklch(68%_0.15_75)] bg-[oklch(80%_0.14_85)]"
            style={
              {
                left: flightOrigin.left,
                top: flightOrigin.top,
                animationDelay: `${i * FLIGHT_STAGGER_MS}ms`,
                '--dx': `${f.dx}px`,
                '--dy': `${f.dy}px`,
              } as CSSProperties
            }
          />
        ))}

      <div className="anim-sheet-up absolute inset-x-4 bottom-0 mx-auto flex max-w-lg flex-col items-center gap-4 rounded-t-[32px] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-card">
        <div
          ref={balanceRef}
          className={`absolute top-4 right-5 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg py-1.5 pr-3 pl-2 ${bump ? 'anim-bump' : ''}`}
        >
          <span className="size-4 rounded-full border-[2.5px] border-[oklch(68%_0.15_75)] bg-[oklch(80%_0.14_85)] box-border" />
          <span className="font-mono text-[13px] font-bold text-ink tabular-nums">{displayBalance ?? balance ?? 0}</span>
        </div>

        <span
          className="anim-pop-in absolute -top-8 flex size-16 items-center justify-center rounded-full border-4 border-surface bg-accent text-2xl font-bold text-white"
          style={{ animationDelay: '140ms', animationFillMode: 'both' }}
        >
          ✓
        </span>

        <div className="mt-4">
          <h1 className="anim-rise font-display text-[23px] font-extrabold text-ink" style={{ animationDelay: '220ms' }}>
            {headline}
          </h1>
          <p className="anim-rise mt-1 text-sm text-ink-muted" style={{ animationDelay: '260ms' }}>
            {difficultyLabel}
            {levelNumber != null ? ` · Level ${levelNumber}` : ''}
          </p>
        </div>

        {!zenMode && (
          <p
            className="anim-rise font-mono text-[52px] font-extrabold leading-none tabular-nums text-ink"
            style={{ animationDelay: '320ms' }}
          >
            {formatElapsed(timeMs)}
          </p>
        )}

        {coinsAwarded > 0 && (
          <div
            className="anim-rise flex items-center gap-2 rounded-full border-[1.5px] border-[oklch(85%_0.08_85)] bg-[oklch(96%_0.03_85)] py-2 pr-4 pl-3"
            style={{ animationDelay: '380ms' }}
          >
            <span ref={rewardCoinRef} className="size-5 rounded-full border-2 border-[oklch(68%_0.15_75)] bg-[oklch(80%_0.14_85)] box-border" />
            <span className="text-[15px] font-extrabold text-[oklch(45%_0.11_75)]">+{coinsAwarded} coins</span>
            {isPersonalBest && <span className="text-xs font-semibold text-[oklch(55%_0.08_75)]">personal best</span>}
            {dailyBonusApplied && <span className="text-xs font-semibold text-[oklch(55%_0.08_75)]">🔥 daily bonus ×2</span>}
          </div>
        )}

        {chapterComplete && (
          <div
            className="anim-rise flex w-full flex-col items-center gap-1 rounded-2xl bg-accent py-3.5 text-white"
            style={{ animationDelay: '400ms' }}
          >
            <span className="text-[11px] font-bold tracking-wide uppercase opacity-80">
              Chapter {chapterComplete.chapterNumber} complete
            </span>
            <span className="text-[15px] font-bold">{chapterComplete.chapterName}</span>
            {chapterComplete.skinUnlocked && (
              <span className="mt-1 text-[12.5px] font-semibold opacity-90">
                New skin unlocked: {getSkin(chapterComplete.skinUnlocked).name}
              </span>
            )}
          </div>
        )}

        {isDaily ? (
          <div
            className="anim-rise flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-tint py-3.5"
            style={{ animationDelay: '420ms' }}
          >
            <span className="text-lg">🔥</span>
            <span className="text-[15px] font-bold text-ink">{dailyStreak ?? 0} day streak</span>
          </div>
        ) : (
          !zenMode && (
            <div className="anim-rise flex w-full rounded-2xl bg-accent-tint py-3" style={{ animationDelay: '420ms' }}>
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
          )
        )}

        <div className="anim-rise flex w-full flex-col gap-2" style={{ animationDelay: '500ms' }}>
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
