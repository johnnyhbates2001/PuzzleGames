import type { LevelModifiers } from '../games/chapters'
import { modifierLabel } from '../games/chapters'
import { AppLink as Link } from './AppLink'
import { NoHintsIcon, NoUndoIcon, PerfectRunIcon, TimedIcon } from './icons'

interface BossGateSheetProps {
  chapterNumber: number
  modifiers: LevelModifiers
  backHref: string
  onBegin: () => void
}

const MODIFIER_INFO: Record<string, { icon: (props: { size?: number }) => React.JSX.Element; explain: string }> = {
  Timed: { icon: TimedIcon, explain: 'The clock is ticking — solve before time runs out.' },
  'No Undo': { icon: NoUndoIcon, explain: "You won't be able to take back a move." },
  'No Hints': { icon: NoHintsIcon, explain: 'Hints are turned off for this level.' },
  'Perfect Run': { icon: PerfectRunIcon, explain: 'One wrong move ends the run.' },
}

/** Full-screen (not a bottom sheet) confirmation shown before a boss level (story
 *  chapter 20, or an Endless chapter's 20th level) starts — announces its active
 *  modifiers up front instead of letting the player discover them mid-run (see the
 *  Game*Page.tsx init effects for the gating). */
export function BossGateSheet({ chapterNumber, modifiers, backHref, onBegin }: BossGateSheetProps) {
  const labels = modifierLabel(modifiers).split(' · ').filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-bg px-6 text-center text-ink">
      <span className="rounded-full bg-accent-tint px-3.5 py-1.5 text-[12px] font-bold text-accent">
        Chapter {chapterNumber} · Level 20
      </span>
      <div>
        <h1 className="font-display text-[26px] font-extrabold">Boss level</h1>
        <p className="mt-1.5 text-sm text-ink-muted">This level plays under extra rules — know them before you start.</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2.5">
        {labels.map((label) => {
          const info = MODIFIER_INFO[label]
          if (!info) return null
          const Icon = info.icon
          return (
            <div key={label} className="flex items-center gap-3.5 rounded-2xl bg-surface p-3.5 text-left shadow-card">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-accent-tint text-accent">
                <Icon size={20} />
              </span>
              <div>
                <p className="text-[14.5px] font-bold text-ink">{label}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-muted">{info.explain}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex w-full max-w-sm flex-col gap-3">
        <button type="button" onClick={onBegin} className="w-full rounded-full bg-accent py-3.5 font-bold text-white">
          Begin
        </button>
        <Link to={backHref} className="text-[13.5px] font-semibold text-ink-muted">
          Back to chapters
        </Link>
      </div>
    </div>
  )
}
