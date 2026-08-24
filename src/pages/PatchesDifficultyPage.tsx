import { useEffect, useState } from 'react'
import { AppLink as Link } from '../components/AppLink'
import { PATCHES_SIZE, type Difficulty } from '../engine/patches/types'
import { averageTimeMs, getPatchesProgress, type DifficultyProgress } from '../storage/db'
import { formatElapsed } from '../components/Timer'
import { PatchesGridPreview } from '../components/PatchesGridPreview'
import { RulesButton, RulesSheet } from '../components/RulesSheet'
import { GAME_RULES } from '../games/rules'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const DOT_CLASS: Record<Difficulty, string> = {
  easy: 'bg-diff-easy',
  medium: 'bg-diff-medium',
  hard: 'bg-diff-hard',
}

export default function PatchesDifficultyPage() {
  const [progress, setProgress] = useState<Partial<Record<Difficulty, DifficultyProgress>>>({})
  const [rulesOpen, setRulesOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all(DIFFICULTIES.map((d) => getPatchesProgress(d))).then((results) => {
      if (cancelled) return
      const map: Partial<Record<Difficulty, DifficultyProgress>> = {}
      DIFFICULTIES.forEach((d, i) => {
        map[d] = results[i]
      })
      setProgress(map)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main
      data-game="patches"
      className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] text-ink"
    >
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex size-9 items-center justify-center rounded-full bg-accent-tint text-accent"
          aria-label="Home"
        >
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M8 1L1 7.5 8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <RulesButton onClick={() => setRulesOpen(true)} />
      </div>
      <h1 className="font-display text-[28px] font-extrabold">Patches</h1>
      <div className="flex flex-col gap-3">
        {DIFFICULTIES.map((d) => {
          const p = progress[d]
          const avg = p ? averageTimeMs(p) : null
          return (
            <Link
              key={d}
              to={`/patches/${d}`}
              className="flex items-center gap-4 rounded-[20px] bg-surface p-4 shadow-card transition hover:shadow-md"
            >
              <div className="size-[52px] shrink-0 overflow-hidden rounded-xl bg-bg p-1.5">
                <PatchesGridPreview />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`size-2 shrink-0 rounded-full ${DOT_CLASS[d]}`} />
                  <h2 className="text-[17px] font-bold">{LABELS[d]}</h2>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-muted">
                  {PATCHES_SIZE[d]}×{PATCHES_SIZE[d]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-ink-muted">{p ? p.completedCount : 0} done</p>
                <p className="mt-0.5 font-mono text-[13px] tabular-nums text-ink-muted dark:text-accent">
                  {avg !== null && avg !== undefined ? `avg ${formatElapsed(avg)}` : 'avg —'}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <RulesSheet
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Patches"
        steps={GAME_RULES.patches.steps}
        tip={GAME_RULES.patches.tip}
      />
    </main>
  )
}
