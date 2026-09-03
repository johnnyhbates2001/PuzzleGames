import { useEffect, useState } from 'react'
import { AppLink as Link } from '../components/AppLink'
import { GAMES } from '../games/registry'
import { SettingsButton } from '../components/SettingsButton'
import { CoinBalance } from '../components/CoinBalance'
import { TabBar } from '../components/TabBar'
import { BookIcon, CheckIcon, ChevronRightIcon, FlameIcon } from '../components/icons'
import { getDailyChallenge, getDailyStreak, getHeatmap, getSettings, maybeApplyStreakFreeze, setLastSeenStreak } from '../storage/db'
import type { Difficulty } from '../engine/types'
import { todayDateKey, type DailyGameId } from '../games/dailyChallenge'
import { buildChapterNodes, endlessProgress } from '../games/chapters'
import { PREVIEW_BY_ID, PRIMARY_ROUTE_OVERRIDE, PROGRESS_GETTER } from '../games/gamePreviews'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

// Streak pips fill left-to-right at this stagger; the flame's bump waits for the last
// pip to finish (its own pip-fill keyframe runs 380ms — see index.css) before firing.
const PIP_STAGGER_MS = 50
const PIP_FILL_DURATION_MS = 380

interface GameProgressSummary {
  solved: number
  /** What to show in place of the row's description once she's played this game at
   *  least once — either "Ch N · Name" or, once hard's story is finished, "Endless ·
   *  Chapter N". Null only for a freshly-registered game with zero progress. */
  context: { label: string; endless: boolean } | null
}

async function loadGameProgress(gameId: string): Promise<GameProgressSummary> {
  const getter = PROGRESS_GETTER[gameId]
  const [easy, medium, hard] = await Promise.all(DIFFICULTIES.map((d) => getter(d)))
  const solved = easy.completedCount + medium.completedCount + hard.completedCount

  const endless = endlessProgress(hard.currentLevelIndex)
  if (endless) {
    return { solved, context: { label: `Endless · Chapter ${endless.endlessChapter}`, endless: true } }
  }
  const nodes = buildChapterNodes({ easy: easy.currentLevelIndex, medium: medium.currentLevelIndex, hard: hard.currentLevelIndex })
  const current = nodes.find((n) => n.status === 'current')
  return { solved, context: current ? { label: `Ch ${current.chapterNumber} · ${current.meta.name}`, endless: false } : null }
}

export default function HomePage() {
  const [coins, setCoins] = useState(0)
  const [streak, setStreak] = useState(0)
  const [streakWeek, setStreakWeek] = useState<boolean[]>([])
  const [progressByGame, setProgressByGame] = useState<Record<string, GameProgressSummary>>({})
  const [dailyDoneByGame, setDailyDoneByGame] = useState<Record<string, boolean>>({})
  const [dailyStreakByGame, setDailyStreakByGame] = useState<Record<string, number>>({})
  // True only for the first Home visit after the streak actually advances — gates the
  // pip-fill/flame-bounce below so it plays once per new streak day, not every visit.
  const [streakAdvanced, setStreakAdvanced] = useState(false)
  // True for the visit where a banked Streak Freeze silently bridged yesterday's missed
  // day — see maybeApplyStreakFreeze, called before streak/heatmap are read below so
  // both already reflect the bridged day.
  const [streakFreezeUsed, setStreakFreezeUsed] = useState(false)

  const dateKey = todayDateKey()
  const firstRun = GAMES.every((g) => !progressByGame[g.id]?.solved)

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => !cancelled && setCoins(s.coins))
    // Sequenced (not run in parallel with the streak/heatmap reads below) — a banked
    // Streak Freeze backfills dailyActivity for a missed day, and both getStreak and
    // getHeatmap need to see that write before they run, or they'd read the pre-bridge
    // state and report the streak as broken for one more visit.
    maybeApplyStreakFreeze().then(({ applied, streak: s }) => {
      if (cancelled) return
      setStreakFreezeUsed(applied)
      setStreak(s)
      getSettings().then((settings) => {
        if (cancelled || s <= settings.lastSeenStreak) return
        setStreakAdvanced(true)
        void setLastSeenStreak(s)
      })
      getHeatmap(1).then((counts) => !cancelled && setStreakWeek(counts.map((c) => c > 0)))
    })
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
    Promise.all(GAMES.map((g) => loadGameProgress(g.id))).then((results) => {
      if (cancelled) return
      const map: Record<string, GameProgressSummary> = {}
      GAMES.forEach((g, i) => {
        map[g.id] = results[i]
      })
      setProgressByGame(map)
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

      {!firstRun && streak > 0 && (
        <div className="anim-rise flex items-center gap-2.5 rounded-[18px] bg-accent-tint px-3.5 py-3">
          <span
            className={`flex text-accent ${streakAdvanced ? 'anim-bump' : ''}`}
            style={
              streakAdvanced
                ? {
                    animationDelay: `${(streakWeek.length - 1) * PIP_STAGGER_MS + PIP_FILL_DURATION_MS}ms`,
                    animationFillMode: 'both',
                  }
                : undefined
            }
          >
            <FlameIcon />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">
              {streak} day streak
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {streakFreezeUsed ? '🧊 A Streak Freeze covered yesterday' : 'Solve one today to keep it'}
            </p>
          </div>
          <div className="flex gap-1">
            {streakWeek.map((on, i) => (
              <span
                key={i}
                className={`size-4 rounded-[5px] ${on ? 'bg-accent' : 'bg-accent-tint border border-border-dashed'} ${
                  on && streakAdvanced ? 'anim-pip-fill' : ''
                }`}
                style={on && streakAdvanced ? { animationDelay: `${i * PIP_STAGGER_MS}ms` } : undefined}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {firstRun ? (
          <div className="anim-rise flex flex-col gap-3 rounded-[26px] bg-accent-tint p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[13px] bg-accent text-white">
                <BookIcon size={20} />
              </span>
              <div>
                <p className="text-[16px] font-bold text-ink">Start with {GAMES[0].title}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-muted">Five puzzle types, thirty chapters each.</p>
              </div>
            </div>
            <Link
              to={PRIMARY_ROUTE_OVERRIDE[GAMES[0].id] ?? GAMES[0].route}
              className="flex h-11 items-center justify-center rounded-full bg-accent text-[14.5px] font-bold text-white"
            >
              Play the first level
            </Link>
          </div>
        ) : (
          <div className="anim-rise rounded-3xl bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-[14.5px] font-bold text-ink">Daily Challenges</h2>
              <p className="text-xs font-semibold text-ink-muted">
                {Object.values(dailyDoneByGame).filter(Boolean).length} of {GAMES.length} done
              </p>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {GAMES.map((game) => {
                const done = dailyDoneByGame[game.id]
                const gameStreak = dailyStreakByGame[game.id] ?? 0
                return (
                  <Link key={game.id} to={`${game.route}/daily`} className="flex flex-col items-center gap-1">
                    <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-tint p-2 shadow-card">
                      {PREVIEW_BY_ID[game.id]}
                      {done && (
                        <span className="absolute -top-1 -right-1 flex size-[19px] items-center justify-center rounded-full border-2 border-surface bg-accent text-white">
                          <CheckIcon size={9} />
                        </span>
                      )}
                    </span>
                    <span className="max-w-full truncate text-[10px] font-medium text-ink-muted">{game.title}</span>
                    {gameStreak > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-accent">
                        <FlameIcon size={9} />
                        {gameStreak}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
        {GAMES.map((game, i) => {
          const progress = progressByGame[game.id]
          return (
            <Link
              key={game.id}
              data-game={game.id}
              to={PRIMARY_ROUTE_OVERRIDE[game.id] ?? game.route}
              className={`anim-rise flex items-center gap-3.5 rounded-3xl bg-surface shadow-card transition hover:shadow-md ${
                firstRun ? 'p-4' : 'p-3'
              }`}
              style={{ animationDelay: `${Math.min(i + 1, 6) * 45}ms` }}
            >
              <div
                className={`flex shrink-0 items-center justify-center rounded-2xl bg-accent-tint ${
                  firstRun ? 'size-14 p-2.5' : 'size-12 p-2'
                }`}
              >
                {PREVIEW_BY_ID[game.id]}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={firstRun ? 'text-[20px] font-bold' : 'text-[17.5px] font-bold'}>{game.title}</h2>
                {firstRun ? (
                  <p className="mt-1 text-sm text-ink-muted">{game.description}</p>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-accent">{progress?.context?.label ?? game.description}</p>
                )}
              </div>
              {firstRun ? (
                <span className="flex shrink-0 text-ink-muted">
                  <ChevronRightIcon />
                </span>
              ) : (
                <div className="flex shrink-0 items-center gap-2.5">
                  {!!progress?.solved && <span className="font-mono text-xs text-ink-muted">{progress.solved}</span>}
                  <span className="flex text-ink-muted">
                    <ChevronRightIcon />
                  </span>
                </div>
              )}
            </Link>
          )
        })}
      </div>

      <TabBar active="play" />
    </main>
  )
}
