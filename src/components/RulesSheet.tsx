import { CloseIcon, HelpCircleIcon, LightbulbIcon } from './icons'
import { useDismissable } from '../hooks/useDismissable'
import { useSheetDrag } from '../hooks/useSheetDrag'
import { RulesMiniBoard } from './RulesMiniBoard'

interface RulesSheetProps {
  open: boolean
  onClose: () => void
  title: string
  steps: string[]
  tip?: string
  /** GameDefinition.id — drives the small worked-example mini-board beside the
   *  title (see RulesMiniBoard.tsx). Omitted, the header falls back to title-only. */
  gameId?: string
}

const EXIT_DURATION_MS = 240

export function RulesSheet({ open, onClose, title, steps, tip, gameId }: RulesSheetProps) {
  const { shouldRender, exiting } = useDismissable(open, EXIT_DURATION_MS)
  const { dragY, dragging, handleProps } = useSheetDrag(onClose)
  if (!shouldRender) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-ink/35 transition-opacity duration-[240ms] ${exiting ? 'opacity-0' : 'opacity-100'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`How to play ${title}`}
    >
      <div
        className={`w-full max-w-lg rounded-t-[32px] bg-surface p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-card ${exiting ? 'anim-sheet-down' : 'anim-sheet-up'}`}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : 'transform 200ms ease-out' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 touch-none rounded-full bg-bg" {...handleProps} />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {gameId && <RulesMiniBoard gameId={gameId} />}
            <h2 className="font-display text-xl font-extrabold text-ink">How to play {title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted"
          >
            <CloseIcon />
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
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-accent-tint px-3 py-2.5 text-[13px] font-medium text-accent">
            <LightbulbIcon size={17} className="shrink-0" />
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
      <HelpCircleIcon size={16} />
    </button>
  )
}
