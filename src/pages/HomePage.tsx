import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GAMES } from '../games/registry'
import { SudokuGridPreview } from '../components/SudokuGridPreview'
import { ZipGridPreview } from '../components/ZipGridPreview'
import { PatchesGridPreview } from '../components/PatchesGridPreview'
import { SettingsButton } from '../components/SettingsButton'
import { CoinBalance } from '../components/CoinBalance'
import { TabBar } from '../components/TabBar'
import {
  getHeatmap,
  getPatchesProgress,
  getProgress,
  getSettings,
  getStreak,
  getSudokuProgress,
  getZipProgress,
} from '../storage/db'
import type { Difficulty } from '../engine/types'

const PREVIEW_BY_ID: Record<string, ReactNode> = {
  queens: <img src="/icons/source.svg" alt="" className="size-full rounded-xl" />,
  sudoku: <SudokuGridPreview />,
  zip: <ZipGridPreview />,
  patches: <PatchesGridPreview />,
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

const PROGRESS_GETTER: Record<string, (d: Difficulty) => ReturnType<typeof getProgress>> = {
  queens: getProgress,
  sudoku: getSudokuProgress,
  zip: getZipProgress,
  patches: getPatchesProgress,
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

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => !cancelled && setCoins(s.coins))
    getStreak().then((s) => !cancelled && setStreak(s))
    getHeatmap(1).then((counts) => !cancelled && setStreakWeek(counts.map((c) => c > 0)))
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
  }, [])

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink">
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
        <div className="flex items-center gap-2.5 rounded-[18px] bg-accent-tint px-3.5 py-3">
          <span className="text-xl">🔥</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">
              {streak} day streak
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">Solve one today to keep it</p>
          </div>
          <div className="flex gap-1">
            {streakWeek.map((on, i) => (
              <span key={i} className={`size-4 rounded-[5px] ${on ? 'bg-accent' : 'bg-accent-tint border border-border-dashed'}`} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {GAMES.map((game) => (
          <Link
            key={game.id}
            to={game.route}
            className="flex items-center gap-4 rounded-3xl bg-surface p-4 shadow-card transition hover:shadow-md"
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-tint p-2.5">
              {PREVIEW_BY_ID[game.id]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[20px] font-bold">{game.title}</h2>
                {!!solvedByGame[game.id] && (
                  <span className="rounded-full bg-accent-tint px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent uppercase">
                    {solvedByGame[game.id]} solved
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-muted">{game.description}</p>
            </div>
            <span className="shrink-0 text-lg text-ink-muted">›</span>
          </Link>
        ))}
        <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-border-dashed p-4 opacity-60">
          <div className="size-14 shrink-0 rounded-2xl border-2 border-dashed border-border-dashed" />
          <div>
            <h2 className="text-base font-bold">More puzzles</h2>
            <p className="mt-0.5 text-sm text-ink-muted">Coming soon</p>
          </div>
        </div>
      </div>

      <TabBar active="play" />
    </main>
  )
}
