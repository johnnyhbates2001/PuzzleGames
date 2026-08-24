interface ToggleRowProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** Reusable label + pill-switch row for SettingsButton — sound, haptics, auto-place-X
 *  all share this rather than each hand-rolling their own switch markup. */
export function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl bg-bg px-3.5 py-3"
    >
      <span className="text-sm font-medium text-ink">{label}</span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border-dashed'}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
