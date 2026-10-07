/** Layered over a square the hint card is waiting on (see HintExplanation): gold for a
 *  square a "Show next step" hint wants the player to fill in, red for one "Check my
 *  work" (or a hint) flagged as wrong. An overlay rather than a cell class so it never
 *  hides what the cell's own background means (region colour, a filled square…).
 *  The parent cell must be `relative`. */
export function HintOverlay({ target, flagged }: { target?: boolean; flagged?: boolean }) {
  if (!target && !flagged) return null
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-[1] ring-[3px] ring-inset ${flagged ? 'ring-danger' : 'ring-[oklch(70%_0.16_75)]'}`}
    >
      <span className={`anim-hint-breathe absolute inset-0 ${flagged ? 'bg-danger/20' : 'bg-[oklch(80%_0.14_85)]/35'}`} />
    </span>
  )
}
