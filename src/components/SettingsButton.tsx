import { useEffect, useState } from 'react'
import { useTheme, type ThemePreference } from '../hooks/useTheme'
import { useAudio } from '../hooks/useAudio'
import { ToggleRow } from './ToggleRow'
import { getSettings, setAutoPlaceX as setAutoPlaceXDb, setZenMode as setZenModeDb } from '../storage/db'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useTheme()
  const { soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled } = useAudio()
  const [autoPlaceX, setAutoPlaceX] = useState(true)
  const [zenMode, setZenMode] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => {
      if (cancelled) return
      setAutoPlaceX(s.autoPlaceX)
      setZenMode(s.zenMode)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <button
        type="button"
        aria-label="Settings"
        onClick={() => setOpen(true)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted shadow-card transition hover:text-ink"
      >
        <GearIcon />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Settings</h2>
              <button
                type="button"
                aria-label="Close settings"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center text-xl text-ink-muted"
              >
                ×
              </button>
            </div>

            <p className="mb-2 text-sm font-medium text-ink-muted">Appearance</p>
            <div className="mb-4 flex gap-1 rounded-2xl bg-bg p-1">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={theme === option.value}
                  onClick={() => setTheme(option.value)}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                    theme === option.value ? 'bg-accent text-white' : 'text-ink-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <p className="mb-2 text-sm font-medium text-ink-muted">Sound &amp; haptics</p>
            <div className="mb-4 flex flex-col gap-2">
              <ToggleRow label="Sound effects" checked={soundEnabled} onChange={setSoundEnabled} />
              <ToggleRow label="Haptics" checked={hapticsEnabled} onChange={setHapticsEnabled} />
            </div>

            <p className="mb-2 text-sm font-medium text-ink-muted">Gameplay</p>
            <div className="flex flex-col gap-2">
              <ToggleRow
                label="Auto-place X's (Queens)"
                checked={autoPlaceX}
                onChange={(enabled) => {
                  setAutoPlaceX(enabled)
                  void setAutoPlaceXDb(enabled)
                }}
              />
              <ToggleRow
                label="Zen mode — hide timers"
                checked={zenMode}
                onChange={(enabled) => {
                  setZenMode(enabled)
                  void setZenModeDb(enabled)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
