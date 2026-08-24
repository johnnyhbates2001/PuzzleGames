interface RulesSheetProps {
  open: boolean
  onClose: () => void
  title: string
  steps: string[]
  tip?: string
}

export function RulesSheet({ open, onClose, title, steps, tip }: RulesSheetProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`How to play ${title}`}
    >
      <div
        className="anim-sheet-up w-full max-w-lg rounded-t-[32px] bg-surface p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-bg" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">How to play {title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 items-center justify-center text-xl text-ink-muted"
          >
            ×
          </button>
        </div>

        <ol className="flex flex-col gap-2.5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 rounded-2xl border border-border-dashed p-3.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[13px] font-bold text-accent">
                {i + 1}
              </span>
              <span className="text-[14px] leading-snug text-ink">{step}</span>
            </li>
          ))}
        </ol>

        {tip && (
          <p className="mt-3 rounded-xl bg-accent-tint px-3 py-2 text-center text-[13px] font-medium text-accent">
            {tip}
          </p>
        )}
      </div>
    </div>
  )
}

export function RulesButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="How to play"
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-full bg-accent-tint text-accent"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </button>
  )
}
