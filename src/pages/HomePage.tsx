import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GAMES } from '../games/registry'
import { GridPreview } from '../components/GridPreview'
import { REGION_COLORS } from '../components/Cell'
import { SudokuGridPreview } from '../components/SudokuGridPreview'
import { ZipGridPreview } from '../components/ZipGridPreview'
import { PatchesGridPreview } from '../components/PatchesGridPreview'

const PREVIEW_BY_ID: Record<string, ReactNode> = {
  queens: <GridPreview colors={REGION_COLORS.slice(0, 9)} />,
  sudoku: <SudokuGridPreview />,
  zip: <ZipGridPreview />,
  patches: <PatchesGridPreview />,
}

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] text-ink">
      <div>
        <h1 className="font-display text-[34px] font-extrabold tracking-tight">Puzzles</h1>
        <p className="mt-1 text-[15px] text-ink-muted">Offline puzzles, just for us.</p>
      </div>
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
              <h2 className="text-[20px] font-bold">{game.title}</h2>
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
    </main>
  )
}
