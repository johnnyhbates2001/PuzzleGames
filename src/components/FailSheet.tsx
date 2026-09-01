import { AppLink as Link } from './AppLink'
import { TimedIcon } from './icons'

interface FailSheetProps {
  reason: 'timeout' | 'mistake'
  chaptersHref: string
  onTryAgain: () => void
  /** Small context pills below the body copy, e.g. "Timed · 3:00" / "Reached 14 of
   *  20" — see each Game*Page.tsx's boss-modifier watchers for how these are built. */
  chips?: string[]
}

const COPY: Record<FailSheetProps['reason'], { headline: string; body: string }> = {
  timeout: { headline: "Time's up!", body: 'The clock ran out on this boss level.' },
  mistake: { headline: 'Wrong move!', body: 'Perfect Run ends on the first mistake.' },
}

/** Rendered directly inside a Game*Page (not a route change — nothing here gets
 *  persisted to storage/db.ts, unlike the win path via CompletePage/CompleteSheet) when
 *  a Timed or Perfect Run boss-level modifier ends the level early. Its full-viewport
 *  overlay is what actually blocks further board/Controls interaction — no per-handler
 *  guards needed in the page itself. */
export function FailSheet({ reason, chaptersHref, onTryAgain, chips }: FailSheetProps) {
  const { headline, body } = COPY[reason]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40">
      <div className="anim-sheet-up flex w-full max-w-lg flex-col items-center gap-4 rounded-t-[32px] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-card">
        <span className="flex size-16 items-center justify-center rounded-full border-4 border-surface bg-[oklch(94%_0.04_25)] text-danger">
          <TimedIcon size={26} />
        </span>
        <div>
          <h1 className="font-display text-[23px] font-extrabold text-ink">{headline}</h1>
          <p className="mt-1 text-sm text-ink-muted">{body}</p>
          <p className="mt-0.5 text-sm text-ink-muted">Your chapter progress is safe.</p>
        </div>
        {chips && chips.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {chips.map((chip) => (
              <span key={chip} className="flex h-8 items-center rounded-full bg-bg px-3 text-xs font-bold text-ink-muted">
                {chip}
              </span>
            ))}
          </div>
        )}
        <div className="flex w-full flex-col gap-2">
          <button type="button" onClick={onTryAgain} className="w-full rounded-full bg-accent py-3 font-semibold text-white">
            Try again
          </button>
          <Link to={chaptersHref} className="w-full rounded-full bg-bg py-3 text-center font-semibold text-ink-muted">
            Back to chapters
          </Link>
        </div>
      </div>
    </div>
  )
}
