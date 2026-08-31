import { useEffect, useMemo, useState } from 'react'
import { TabBar } from '../components/TabBar'
import { FlameIcon, GemIcon, CrownIcon, StarIcon, TargetIcon } from '../components/icons'
import { ACHIEVEMENTS, type AchievementContext, type AchievementIconGroup } from '../achievements/definitions'
import { buildAchievementContext } from '../achievements/context'
import { getSettings, markAchievementsSeen } from '../storage/db'

const ICON_BY_GROUP: Record<AchievementIconGroup, (props: { size?: number }) => React.JSX.Element> = {
  star: StarIcon,
  target: TargetIcon,
  flame: FlameIcon,
  gem: GemIcon,
  crown: CrownIcon,
}

export default function AwardsPage() {
  const [ctx, setCtx] = useState<AchievementContext | null>(null)
  const [seen, setSeen] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    buildAchievementContext().then((c) => {
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

  // Multiple awards can unlock between one visit and the next — stagger them 220ms
  // apart (in ACHIEVEMENTS order) instead of letting them all animate in lockstep.
  const newUnlockStaggerIndex = useMemo(() => {
    const indexById = new Map<string, number>()
    let index = 0
    for (const a of ACHIEVEMENTS) {
      const unlocked = ctx ? a.check(ctx) : false
      if (unlocked && !seen.includes(a.id)) {
        indexById.set(a.id, index)
        index++
      }
    }
    return indexById
  }, [ctx, seen])

  return (
    <main
      data-force-theme="dark"
      className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] text-ink"
    >
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[30px] font-extrabold tracking-tight">Awards</h1>
          <span className="font-mono text-[13px] font-bold text-ink-muted">
            {unlockedCount}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = ctx ? a.check(ctx) : false
          const isNew = unlocked && !seen.includes(a.id)
          const Icon = ICON_BY_GROUP[a.iconGroup]
          const staggerMs = isNew ? (newUnlockStaggerIndex.get(a.id) ?? 0) * 220 : 0
          return (
            <div
              key={a.id}
              className={`relative flex flex-col items-center gap-1.5 overflow-hidden rounded-[18px] bg-surface p-3 text-center ${
                unlocked ? '' : 'opacity-45'
              } ${isNew ? 'anim-ring-flash' : ''}`}
              style={isNew ? { animationDelay: `${staggerMs}ms`, animationFillMode: 'both' } : undefined}
            >
              {/* Diagonal shine sweep — plays once for an award unlocked since the last
                  visit (see `seen`/isNew above), never replays on a later visit to this
                  page since `seen` is only re-read from settings on mount. */}
              {isNew && (
                <span
                  className="anim-shine-sweep pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-white/50"
                  style={{ animationDelay: `${staggerMs}ms`, animationFillMode: 'both' }}
                />
              )}
              {isNew && (
                <span
                  className="anim-pop-in absolute top-1.5 right-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white"
                  style={{ animationDelay: `${520 + staggerMs}ms`, animationFillMode: 'both' }}
                >
                  NEW
                </span>
              )}
              <span
                className={`flex size-10 items-center justify-center rounded-[14px] bg-accent-tint text-accent ${
                  isNew ? 'anim-unlock' : unlocked ? '' : 'grayscale'
                }`}
                style={isNew ? { animationDelay: `${staggerMs}ms`, animationFillMode: 'both' } : undefined}
              >
                <Icon size={22} />
              </span>
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
