import { AppLink as Link } from './AppLink'
import { TimedIcon } from './icons'

interface WordleLoseSheetProps {
  reason: 'timeout' | 'out-of-guesses'
  /** The word that was never guessed — shown so the player at least learns it. */
  answer: string
  chaptersHref: string
  /** Defaults to "Back to chapters" — the Daily Challenge (chaptersHref: '/') passes
   *  "Back to Home" instead, same override CompleteSheet's own chaptersLabel makes. */
  chaptersLabel?: string
  onTryAgain: () => void
}

const COPY: Record<WordleLoseSheetProps['reason'], { headline: string; body: string }> = {
  timeout: { headline: "Time's up!", body: 'The clock ran out on this boss level.' },
  'out-of-guesses': { headline: 'Out of guesses!', body: "You didn't land it this time." },
}

/** Rendered directly inside WordleGamePage (not a route change — nothing here gets
 *  persisted to storage/db.ts, unlike the win path via WordleCompletePage) once a run
 *  ends without solving the word — either the attempt limit ran out or, on a Timed
 *  boss level, the clock did (see games/chapters.ts). Its full-viewport overlay is what
 *  actually blocks further keyboard/board interaction — no per-handler guards needed in
 *  the page itself. */
export function WordleLoseSheet({ reason, answer, chaptersHref, chaptersLabel = 'Back to chapters', onTryAgain }: WordleLoseSheetProps) {
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
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-accent-tint px-4 py-2.5">
          <span className="text-xs font-semibold text-ink-muted">The word was</span>
          <span className="font-mono text-[15px] font-extrabold tracking-wide text-accent uppercase">{answer}</span>
        </div>
        <p className="text-sm text-ink-muted">Your chapter progress is safe.</p>
        <div className="flex w-full flex-col gap-2">
          <button type="button" onClick={onTryAgain} className="w-full rounded-full bg-accent py-3 font-semibold text-white">
            Try again
          </button>
          <Link to={chaptersHref} className="w-full rounded-full bg-bg py-3 text-center font-semibold text-ink-muted">
            {chaptersLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
