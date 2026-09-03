import type { LevelModifiers } from '../games/chapters'
import { modifierLabel } from '../games/chapters'
import type { ConsumableKind, Settings } from '../storage/db'
import { AppLink as Link } from './AppLink'
import { NoHintsIcon, NoUndoIcon, PerfectRunIcon, TimedIcon } from './icons'

/** One Boost the player can opt into for this specific boss level — see the
 *  Game*Page.tsx init effects, which only ever offer a kind whose modifier is active
 *  on this level and whose owned count is > 0. */
export interface BossAssist {
  kind: ConsumableKind
  label: string
  description: string
  owned: number
}

// Flat bonus a Time Freeze Boost adds to a Timed boss level's clock, regardless of the
// level's own base budget — shared by every Game*Page.tsx.
export const TIME_FREEZE_BONUS_MS = 30_000

/** Builds the Boosts offered at a boss gate — one shared implementation for every
 *  Game*Page.tsx instead of six near-identical copies. Only ever offers a kind whose
 *  modifier is actually active on this level and whose owned count is > 0. */
export function buildBossAssists(modifiers: LevelModifiers | null, settings: Settings): BossAssist[] {
  if (!modifiers) return []
  const assists: BossAssist[] = []
  if (modifiers.noUndo && settings.undoTokens > 0) {
    assists.push({ kind: 'undoToken', label: 'Undo Token', description: 'Allows one Undo on this level.', owned: settings.undoTokens })
  }
  if (modifiers.timed && settings.timeFreezes > 0) {
    assists.push({
      kind: 'timeFreeze',
      label: 'Time Freeze',
      description: `Adds ${TIME_FREEZE_BONUS_MS / 1000}s to the clock.`,
      owned: settings.timeFreezes,
    })
  }
  if (modifiers.perfectRun && settings.mistakeSaves > 0) {
    assists.push({ kind: 'mistakeSave', label: 'Mistake Save', description: 'Forgives one mistake on this level.', owned: settings.mistakeSaves })
  }
  return assists
}

interface BossGateSheetProps {
  chapterNumber: number
  modifiers: LevelModifiers
  backHref: string
  onBegin: () => void
  /** Boosts available to spend on this level — omitted/empty renders no Boosts section
   *  at all, so games/levels with nothing owned look exactly like before this feature. */
  assists?: BossAssist[]
  selectedAssists?: Set<ConsumableKind>
  onToggleAssist?: (kind: ConsumableKind) => void
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
export function BossGateSheet({
  chapterNumber,
  modifiers,
  backHref,
  onBegin,
  assists = [],
  selectedAssists,
  onToggleAssist,
}: BossGateSheetProps) {
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

      {assists.length > 0 && (
        <div className="flex w-full max-w-sm flex-col gap-2">
          <p className="text-left text-[11.5px] font-bold tracking-wide text-ink-muted uppercase">Boosts available</p>
          {assists.map((assist) => {
            const active = selectedAssists?.has(assist.kind) ?? false
            return (
              <button
                key={assist.kind}
                type="button"
                onClick={() => onToggleAssist?.(assist.kind)}
                className={`flex items-center justify-between gap-3 rounded-2xl p-3 text-left transition ${
                  active ? 'bg-accent-tint ring-2 ring-accent' : 'bg-surface'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-ink">{assist.label}</span>
                  <span className="block text-[11px] leading-snug text-ink-muted">{assist.description}</span>
                </span>
                <span className="shrink-0 text-[11px] font-bold text-ink-muted">{assist.owned} owned</span>
              </button>
            )
          })}
        </div>
      )}

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
