import { FlagIcon, LightbulbIcon } from './icons'
import type { HintTone } from '../hooks/useHintExplanation'

/** The card for a hint or "Check my work" result — sits under the controls (so the
 *  board never shifts when it appears) while the squares it refers to stay highlighted
 *  on the board. It doesn't fill anything in: it stays until the player has made the
 *  move (or fixed the flagged squares) themselves, or taps "Hide". */
export function HintExplanation({
  label,
  message,
  tone,
  remaining,
  onDismiss,
}: {
  label: string
  message: string
  tone: HintTone
  /** How many highlighted squares are still to fill/fix. */
  remaining: number
  onDismiss: () => void
}) {
  const footer =
    tone === 'step'
      ? remaining === 1
        ? 'Your turn — complete the highlighted square.'
        : `Your turn — complete the ${remaining} highlighted squares.`
      : remaining === 1
        ? 'Circled in red until you change it.'
        : 'Circled in red until you change them.'
  return (
    <div role="status" className="anim-rise flex w-full items-start gap-3 rounded-[20px] bg-surface p-3.5 shadow-card">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-[12px] ${
          tone === 'step' ? 'bg-[oklch(94%_0.06_85)] text-[oklch(55%_0.13_75)]' : 'bg-[oklch(94%_0.04_25)] text-danger'
        }`}
      >
        {tone === 'step' ? <LightbulbIcon size={18} /> : <FlagIcon />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{label}</p>
        <p className="mt-0.5 text-[14px] leading-snug text-ink">{message}</p>
        <p className="mt-1 text-[12px] leading-snug font-semibold text-ink-muted">{footer}</p>
      </div>
      <button type="button" onClick={onDismiss} className="shrink-0 self-center rounded-full bg-accent-tint px-3 py-1.5 text-[12.5px] font-bold text-accent">
        Hide
      </button>
    </div>
  )
}
