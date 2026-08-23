import { useEffect, useState } from 'react'
import { GAMES } from '../games/registry'
import { TabBar } from '../components/TabBar'
import { formatElapsed } from '../components/Timer'
import type { Difficulty } from '../engine/types'
import {
  getHeatmap,
  getPatchesProgress,
  getProgress,
  getSettings,
  getStreak,
  getSudokuProgress,
  getTotalSolved,
  getZipProgress,
  type DifficultyProgress,
} from '../storage/db'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

const PROGRESS_GETTER: Record<string, (d: Difficulty) => Promise<DifficultyProgress>> = {
  queens: getProgress,
  sudoku: getSudokuProgress,
  zip: getZipProgress,
  patches: getPatchesProgress,
}

interface GameSummary {
  id: string
  title: string
  solved: number
  bestMs: number | null
}

async function summarizeGame(gameId: string, title: string): Promise<GameSummary> {
  const getter = PROGRESS_GETTER[gameId]
  const results = await Promise.all(DIFFICULTIES.map((d) => getter(d)))
  const solved = results.reduce((sum, p) => sum + p.completedCount, 0)
  const bests = results.map((p) => p.bestTimeMs).filter((ms): ms is number => ms != null)
  const bestMs = bests.length > 0 ? Math.min(...bests) : null
  return { id: gameId, title, solved, bestMs }
}

const HEAT_LEVELS = ['oklch(26% 0.012 260)', 'oklch(38% 0.07 300)', 'oklch(55% 0.13 300)', 'oklch(72% 0.16 300)']

function heatLevel(count: number): string {
  if (count === 0) return HEAT_LEVELS[0]
  if (count <= 2) return HEAT_LEVELS[1]
  if (count <= 4) return HEAT_LEVELS[2]
  return HEAT_LEVELS[3]
}

export default function StatsPage() {
  const [totalSolved, setTotalSolved] = useState(0)
  const [streak, setStreak] = useState(0)
  const [heatmap, setHeatmap] = useState<number[]>([])
  const [coins, setCoins] = useState(0)
  const [games, setGames] = useState<GameSummary[]>([])

  useEffect(() => {
    let cancelled = false
    getTotalSolved().then((n) => !cancelled && setTotalSolved(n))
    getStreak().then((s) => !cancelled && setStreak(s))
    getHeatmap(5).then((counts) => !cancelled && setHeatmap(counts))
    getSettings().then((s) => !cancelled && setCoins(s.coins))
    Promise.all(GAMES.map((g) => summarizeGame(g.id, g.title))).then((results) => !cancelled && setGames(results))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main
      data-force-theme="dark"
      className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink"
    >
      <h1 className="font-display text-[30px] font-extrabold tracking-tight">Stats</h1>

      <div className="flex gap-2.5">
        <StatTile value={String(totalSolved)} label="Solved" color="oklch(96% 0.01 260)" />
        <StatTile value={String(streak)} label="Streak" color="oklch(76% 0.15 300)" />
        <StatTile value={String(coins)} label="Coins" color="oklch(80% 0.14 85)" />
      </div>

      <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-4">
        <p className="text-[13px] font-bold">Last 5 weeks</p>
        <div className="grid grid-cols-7 gap-[5px]">
          {heatmap.map((count, i) => (
            <div key={i} className="aspect-square rounded-[6px]" style={{ backgroundColor: heatLevel(count) }} />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
          <span>Less</span>
          <div className="flex gap-[3px]">
            {HEAT_LEVELS.map((c, i) => (
              <span key={i} className="size-[11px] rounded-[3px]" style={{ backgroundColor: c }} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="flex flex-col rounded-[22px] bg-surface px-3.5">
        {games.map((g, i) => (
          <div
            key={g.id}
            className={`flex items-center gap-3 py-3 ${i < games.length - 1 ? 'border-b border-[oklch(30%_0.014_260)]' : ''}`}
          >
            <span className="size-2.5 shrink-0 rounded-full bg-accent" />
            <span className="flex-1 text-[15px] font-bold">{g.title}</span>
            <div className="text-right">
              <p className="font-mono text-[14px] font-bold tabular-nums">{g.bestMs !== null ? formatElapsed(g.bestMs) : '—'}</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">{g.solved} solved</p>
            </div>
          </div>
        ))}
      </div>

      <TabBar active="stats" />
    </main>
  )
}

function StatTile({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-[20px] bg-surface px-3 py-3.5">
      <span className="font-mono text-2xl font-extrabold" style={{ color }}>
        {value}
      </span>
      <span className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{label}</span>
    </div>
  )
}
