import type { ReactNode } from 'react'
import { useDismissable } from '../hooks/useDismissable'
import { useSheetDrag } from '../hooks/useSheetDrag'

export interface HintOption {
  id: string
  icon: ReactNode
  title: string
  desc: string
  price: number
}

interface HintSheetProps {
  open: boolean
  onClose: () => void
  options: HintOption[]
  coins: number
  onUseHint: (id: string, price: number) => void
  /** Result text from the last "check my work" use, if any — shown until the sheet
   *  reopens or another hint fires. */
  checkMessage?: string | null
}

const EXIT_DURATION_MS = 240

export function HintSheet({ open, onClose, options, coins, onUseHint, checkMessage }: HintSheetProps) {
  const { shouldRender, exiting } = useDismissable(open, EXIT_DURATION_MS)
  const { dragY, dragging, handleProps } = useSheetDrag(onClose)
  if (!shouldRender) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-ink/35 transition-opacity duration-[240ms] ${exiting ? 'opacity-0' : 'opacity-100'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Hints"
    >
      <div
        className={`w-full max-w-lg rounded-t-[32px] bg-surface p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-card ${exiting ? 'anim-sheet-down' : 'anim-sheet-up'}`}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : 'transform 200ms ease-out' } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-9 touch-none rounded-full bg-bg" {...handleProps} />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">Need a hand?</h2>
          <span className="flex items-center gap-1.5 rounded-full border-[1.5px] border-[oklch(85%_0.08_85)] bg-[oklch(96%_0.03_85)] py-1.5 pr-3 pl-2">
            <span className="size-4 rounded-full border-2 border-[oklch(68%_0.15_75)] bg-[oklch(80%_0.14_85)] box-border" />
            <span className="font-mono text-[13px] font-bold text-[oklch(45%_0.11_75)]">{coins}</span>
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {options.map((opt) => {
            const affordable = coins >= opt.price
            return (
              <button
                key={opt.id}
                type="button"
                disabled={!affordable}
                onClick={() => onUseHint(opt.id, opt.price)}
                className={`flex items-center gap-3 rounded-2xl border border-border-dashed p-3.5 text-left transition ${
                  affordable ? 'bg-surface' : 'bg-bg opacity-55'
                }`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-accent-tint text-accent">
                  {opt.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-ink">{opt.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">{opt.desc}</span>
                  {!affordable && (
                    <span className="mt-0.5 block text-[11.5px] font-semibold text-danger">
                      Needs {opt.price - coins} more coins.
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-[oklch(96%_0.03_85)] py-1.5 pr-2.5 pl-1.5">
                  <span className="size-3.5 rounded-full border-2 border-[oklch(68%_0.15_75)] bg-[oklch(80%_0.14_85)] box-border" />
                  <span className="font-mono text-[13px] font-bold text-[oklch(45%_0.11_75)]">{opt.price}</span>
                </span>
              </button>
            )
          })}
        </div>

        {checkMessage && (
          <p className="mt-3 rounded-xl bg-accent-tint px-3 py-2 text-center text-[13px] font-medium text-accent">
            {checkMessage}
          </p>
        )}

        <p className="mt-3 text-center text-[12px] text-ink-muted">
          Using a hint keeps your time but marks the solve as assisted.
        </p>
      </div>
    </div>
  )
}
