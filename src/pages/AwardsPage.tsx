import { useEffect, useState } from 'react'
import { TabBar } from '../components/TabBar'
import { GAMES } from '../games/registry'
import { SKINS } from '../skins'
import { ACHIEVEMENTS, type AchievementContext } from '../achievements/definitions'
import {
  getDailyStreak,
  getNonogramProgress,
  getPatchesProgress,
  getProgress,
  getSettings,
  getStreak,
  getSudokuProgress,
  getZipProgress,
  markAchievementsSeen,
  type DifficultyProgress,
} from '../storage/db'
import type { Difficulty } from '../engine/types'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

const PROGRESS_GETTER: Record<string, (d: Difficulty) => Promise<DifficultyProgress>> = {
  queens: getProgress,
  sudoku: getSudokuProgress,
  zip: getZipProgress,
  patches: getPatchesProgress,
  nonogram: getNonogramProgress,
}

async function solvedForGame(gameId: string): Promise<number> {
  const getter = PROGRESS_GETTER[gameId]
  const results = await Promise.all(DIFFICULTIES.map((d) => getter(d)))
  return results.reduce((sum, p) => sum + p.completedCount, 0)
}

async function buildContext(): Promise<AchievementContext> {
  const [settings, streak, dailyStreak, solvedEntries] = await Promise.all([
    getSettings(),
    getStreak(),
    getDailyStreak(),
    Promise.all(GAMES.map(async (g) => [g.id, await solvedForGame(g.id)] as const)),
  ])
  const solvedByGame = Object.fromEntries(solvedEntries)
  const totalSolved = solvedEntries.reduce((sum, [, n]) => sum + n, 0)
  return {
    totalSolved,
    solvedByGame,
    streak,
    dailyStreak,
    unassistedCompletions: settings.unassistedCompletions,
    ownedSkinCount: settings.ownedSkins.length,
    totalSkinCount: SKINS.length,
  }
}

export default function AwardsPage() {
  const [ctx, setCtx] = useState<AchievementContext | null>(null)
  const [seen, setSeen] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    buildContext().then((c) => {
      if (cancelled) return
      setCtx(c)
      const unlockedIds = ACHIEVEMENTS.filter((a) => a.check(c)).map((a) => a.id)
      getSettings().then((s) => {
        if (cancelled) return
        setSeen(s.seenAchievements)
        const newlyUnlocked = unlockedIds.filter((id) => !s.seenAchievements.includes(id))
        if (newlyUnlocked.length > 0) void markAchievementsSeen(newlyUnlocked)
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const unlockedCount = ctx ? ACHIEVEMENTS.filter((a) => a.check(ctx)).length : 0

  return (
    <main
      data-force-theme="dark"
      className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] text-ink"
    >
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[30px] font-extrabold tracking-tight">Awards</h1>
        <span className="rounded-full bg-surface px-3 py-1.5 text-sm font-bold text-ink-muted">
          {unlockedCount}/{ACHIEVEMENTS.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = ctx ? a.check(ctx) : false
          const isNew = unlocked && !seen.includes(a.id)
          return (
            <div
              key={a.id}
              className={`relative flex flex-col items-center gap-1.5 overflow-hidden rounded-[18px] bg-surface p-3 text-center ${
                unlocked ? '' : 'opacity-45'
              } ${isNew ? 'anim-ring-flash' : ''}`}
            >
              {/* Diagonal shine sweep — plays once for an award unlocked since the last
                  visit (see `seen`/isNew above), never replays on a later visit to this
                  page since `seen` is only re-read from settings on mount. */}
              {isNew && (
                <span className="anim-shine-sweep pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-white/50" />
              )}
              {isNew && (
                <span
                  className="anim-pop-in absolute top-1.5 right-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white"
                  style={{ animationDelay: '520ms', animationFillMode: 'both' }}
                >
                  NEW
                </span>
              )}
              <span className={`text-[26px] ${isNew ? 'anim-unlock' : unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
              <p className="text-[11.5px] font-bold text-ink">{a.title}</p>
              <p className="text-[10px] leading-tight text-ink-muted">{a.description}</p>
            </div>
          )
        })}
      </div>

      <TabBar active="awards" />
    </main>
  )
}
