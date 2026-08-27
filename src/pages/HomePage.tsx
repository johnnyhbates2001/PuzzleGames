import { useEffect, useState, type ReactNode } from 'react'
import { AppLink as Link } from '../components/AppLink'
import { GAMES } from '../games/registry'
import { SudokuGridPreview } from '../components/SudokuGridPreview'
import { ZipGridPreview } from '../components/ZipGridPreview'
import { PatchesGridPreview } from '../components/PatchesGridPreview'
import { NonogramGridPreview } from '../components/NonogramGridPreview'
import { SettingsButton } from '../components/SettingsButton'
import { CoinBalance } from '../components/CoinBalance'
import { TabBar } from '../components/TabBar'
import {
  getDailyChallenge,
  getDailyStreak,
  getHeatmap,
  getNonogramProgress,
  getPatchesProgress,
  getProgress,
  getSettings,
  getStreak,
  getSudokuProgress,
  getZipProgress,
  setLastSeenStreak,
} from '../storage/db'
import type { Difficulty } from '../engine/types'
import { todayDateKey, type DailyGameId } from '../games/dailyChallenge'

const PREVIEW_BY_ID: Record<string, ReactNode> = {
  queens: <img src="/icons/source.svg" alt="" className="size-full rounded-xl" />,
  sudoku: <SudokuGridPreview />,
  zip: <ZipGridPreview />,
  patches: <PatchesGridPreview />,
  nonogram: <NonogramGridPreview />,
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

const PROGRESS_GETTER: Record<string, (d: Difficulty) => ReturnType<typeof getProgress>> = {
  queens: getProgress,
  sudoku: getSudokuProgress,
  zip: getZipProgress,
  patches: getPatchesProgress,
  nonogram: getNonogramProgress,
}

async function totalSolved(gameId: string): Promise<number> {
  const getter = PROGRESS_GETTER[gameId]
  const results = await Promise.all(DIFFICULTIES.map((d) => getter(d)))
  return results.reduce((sum, p) => sum + p.completedCount, 0)
}

export default function HomePage() {
  const [coins, setCoins] = useState(0)
  const [streak, setStreak] = useState(0)
  const [streakWeek, setStreakWeek] = useState<boolean[]>([])
  const [solvedByGame, setSolvedByGame] = useState<Record<string, number>>({})
  const [dailyDoneByGame, setDailyDoneByGame] = useState<Record<string, boolean>>({})
  const [dailyStreakByGame, setDailyStreakByGame] = useState<Record<string, number>>({})
  // True only for the first Home visit after the streak actually advances — gates the
  // pip-fill/flame-bounce below so it plays once per new streak day, not every visit.
  const [streakAdvanced, setStreakAdvanced] = useState(false)

  const dateKey = todayDateKey()

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => !cancelled && setCoins(s.coins))
    Promise.all([getStreak(), getSettings()]).then(([s, settings]) => {
      if (cancelled) return
      setStreak(s)
      if (s > settings.lastSeenStreak) {
        setStreakAdvanced(true)
        void setLastSeenStreak(s)
      }
    })
    getHeatmap(1).then((counts) => !cancelled && setStreakWeek(counts.map((c) => c > 0)))
    Promise.all(GAMES.map((g) => getDailyChallenge(dateKey, g.id as DailyGameId))).then((records) => {
      if (cancelled) return
      const map: Record<string, boolean> = {}
      GAMES.forEach((g, i) => {
        map[g.id] = !!records[i]
      })
      setDailyDoneByGame(map)
    })
    Promise.all(GAMES.map((g) => getDailyStreak(g.id as DailyGameId))).then((streaks) => {
      if (cancelled) return
      const map: Record<string, number> = {}
      GAMES.forEach((g, i) => {
        map[g.id] = streaks[i]
      })
      setDailyStreakByGame(map)
    })
    Promise.all(GAMES.map((g) => totalSolved(g.id))).then((totals) => {
      if (cancelled) return
      const map: Record<string, number> = {}
      GAMES.forEach((g, i) => {
        map[g.id] = totals[i]
      })
      setSolvedByGame(map)
    })
    return () => {
      cancelled = true
    }
  }, [dateKey])

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] text-ink">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[34px] font-extrabold tracking-tight">Puzzles</h1>
          <p className="mt-1 text-[15px] text-ink-muted">Offline puzzles, just for us.</p>
        </div>
        <div className="mt-1.5 flex shrink-0 items-center gap-2">
          <CoinBalance amount={coins} />
          <SettingsButton />
        </div>
      </div>

      {streak > 0 && (
        <div className="anim-rise flex items-center gap-2.5 rounded-[18px] bg-accent-tint px-3.5 py-3">
          <span
            className={`text-xl ${streakAdvanced ? 'anim-bump' : ''}`}
            style={streakAdvanced ? { animationDelay: '560ms', animationFillMode: 'both' } : undefined}
          >
            🔥
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">
              {streak} day streak
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">Solve one today to keep it</p>
          </div>
          <div className="flex gap-1">
            {streakWeek.map((on, i) => (
              <span
                key={i}
                className={`size-4 rounded-[5px] ${on ? 'bg-accent' : 'bg-accent-tint border border-border-dashed'} ${
                  on && streakAdvanced ? 'anim-pip-fill' : ''
                }`}
                style={on && streakAdvanced ? { animationDelay: `${i * 70}ms` } : undefined}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="anim-rise rounded-3xl bg-[oklch(20%_0.02_260)] p-4 shadow-card">
          <h2 className="text-[15px] font-bold text-white">Daily Challenges</h2>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {GAMES.map((game) => {
              const done = dailyDoneByGame[game.id]
              const gameStreak = dailyStreakByGame[game.id] ?? 0
              return (
                <Link key={game.id} to={`${game.route}/daily`} className="flex flex-col items-center gap-1">
                  <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-2">
                    {PREVIEW_BY_ID[game.id]}
                    {done && (
                      <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate text-[10px] font-medium text-white/70">{game.title}</span>
                  {gameStreak > 0 && <span className="text-[9px] font-bold text-white/50">🔥{gameStreak}</span>}
                </Link>
              )
            })}
          </div>
        </div>
        {GAMES.map((game, i) => (
          <Link
            key={game.id}
            to={game.route}
            className="anim-rise flex items-center gap-4 rounded-3xl bg-surface p-4 shadow-card transition hover:shadow-md"
            style={{ animationDelay: `${Math.min(i + 1, 6) * 45}ms` }}
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-tint p-2.5">
              {PREVIEW_BY_ID[game.id]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[20px] font-bold">{game.title}</h2>
                {!!solvedByGame[game.id] && (
                  <span className="anim-pop-in rounded-full bg-accent-tint px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent uppercase">
                    {solvedByGame[game.id]} solved
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-muted">{game.description}</p>
            </div>
            <span className="shrink-0 text-lg text-ink-muted">›</span>
          </Link>
        ))}
      </div>

      <TabBar active="play" />
    </main>
  )
}
