import { AppLink as Link } from './AppLink'
import { endlessProgress } from '../games/chapters'

interface EndlessCardProps {
  /** Hard difficulty's own `currentLevelIndex` — Endless is purely derived from this,
   *  same as every story chapter (see games/chapters.ts). */
  hardCurrentLevelIndex: number
  /** This game's route prefix, e.g. '/queens' — Endless just keeps playing hard. */
  gameRoute: string
}

export function EndlessCard({ hardCurrentLevelIndex, gameRoute }: EndlessCardProps) {
  const endless = endlessProgress(hardCurrentLevelIndex)

  if (!endless) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 opacity-60 shadow-card">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg text-[15px] font-bold text-ink-muted">
          ∞
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-bold text-ink-muted">Endless</p>
          <p className="mt-0.5 text-[12px] text-ink-muted">Unlocks after The Summit</p>
        </div>
      </div>
    )
  }

  return (
    <Link
      to={`${gameRoute}/hard`}
      className="flex items-center gap-3 rounded-2xl bg-accent p-3.5 text-white shadow-card transition hover:shadow-md"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-[15px] font-bold">∞</div>
      <div className="flex-1">
        <p className="text-[15px] font-bold">Endless · Chapter {endless.endlessChapter}</p>
        <p className="mt-0.5 text-[12px] opacity-80">
          Rank {endless.rank} · Level {endless.levelInChapter + 1} of 20
        </p>
      </div>
      <span className="shrink-0 text-lg opacity-80">›</span>
    </Link>
  )
}
