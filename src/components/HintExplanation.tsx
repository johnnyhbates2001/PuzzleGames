import { LightbulbIcon } from './icons'

/** The written reasoning behind a "Show next step" hint — sits under the controls (so
 *  the board never shifts when it appears) while the squares it refers to stay
 *  highlighted on the board. Cleared by "Got it" or by the player's next move. */
export function HintExplanation({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="status" className="anim-rise flex w-full items-start gap-3 rounded-[20px] bg-surface p-3.5 shadow-card">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[oklch(94%_0.06_85)] text-[oklch(55%_0.13_75)]">
        <LightbulbIcon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">Next step</p>
        <p className="mt-0.5 text-[14px] leading-snug text-ink">{message}</p>
      </div>
      <button type="button" onClick={onDismiss} className="shrink-0 self-center rounded-full bg-accent-tint px-3 py-1.5 text-[12.5px] font-bold text-accent">
        Got it
      </button>
    </div>
  )
}
