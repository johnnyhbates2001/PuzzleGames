import { useEffect, useState, type ReactNode } from 'react'
import { AppLink as Link } from './AppLink'
import { useTheme, type ThemePreference } from '../hooks/useTheme'
import { useAudio } from '../hooks/useAudio'
import { useAuth } from '../hooks/useAuth'
import { useBackupSync } from '../hooks/useBackupSync'
import { Avatar } from './Avatar'
import { AVATAR_PRESETS } from '../avatars'
import { setPresetAvatar } from '../api/avatar'
import { useDismissable } from '../hooks/useDismissable'
import { useSheetDrag } from '../hooks/useSheetDrag'
import { ToggleRow } from './ToggleRow'
import { CloseIcon, GearIcon, SpeakerIcon, TimedIcon, VibrationIcon, XMarkIcon } from './icons'
import { getSettings, resetAllProgress, setAutoPlaceX as setAutoPlaceXDb, setZenMode as setZenModeDb } from '../storage/db'

const EXIT_DURATION_MS = 240

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'yellow', label: 'Yellow' },
]

function IconToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: ReactNode
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-accent-tint text-accent">{icon}</span>
      <div className="flex-1">
        <ToggleRow label={label} checked={checked} onChange={onChange} />
      </div>
    </div>
  )
}

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useTheme()
  const { soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled } = useAudio()
  const { user, loading: authLoading, logout, refresh: refreshUser } = useAuth()
  const { status: backupStatus, lastSyncedAt, backupNow, restoreNow, resyncHistory } = useBackupSync()
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [resyncState, setResyncState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle')

  async function handleResyncHistory() {
    setResyncState('busy')
    const ok = await resyncHistory()
    setResyncState(ok ? 'done' : 'failed')
  }

  async function handlePickPreset(presetId: string) {
    setAvatarBusy(true)
    try {
      await setPresetAvatar(presetId)
      await refreshUser()
    } finally {
      setAvatarBusy(false)
    }
  }

  const [autoPlaceX, setAutoPlaceX] = useState(true)
  const [zenMode, setZenMode] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const handleClose = () => setOpen(false)
  const { shouldRender, exiting } = useDismissable(open, EXIT_DURATION_MS)
  const { dragY, dragging, handleProps } = useSheetDrag(handleClose)

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

  async function handleConfirmReset() {
    setResetting(true)
    await resetAllProgress()
    window.location.reload()
  }

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

      {shouldRender && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center bg-black/30 transition-opacity duration-[240ms] sm:items-center ${exiting ? 'opacity-0' : 'opacity-100'}`}
          onClick={handleClose}
        >
          <div
            className={`w-full max-w-sm rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card sm:rounded-3xl ${exiting ? 'anim-sheet-down' : 'anim-sheet-up'}`}
            style={dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: dragging ? 'none' : 'transform 200ms ease-out' } : undefined}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-9 touch-none rounded-full bg-bg sm:hidden" {...handleProps} />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">Settings</h2>
              <button
                type="button"
                aria-label="Close settings"
                onClick={handleClose}
                className="flex size-11 items-center justify-center rounded-full text-ink-muted"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="mb-2 text-sm font-medium text-ink-muted">Account</p>
            <div className="mb-4 flex flex-col gap-2.5 rounded-2xl bg-bg px-4 py-3">
              {authLoading ? (
                <p className="text-sm text-ink-muted">Loading…</p>
              ) : user ? (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar username={user.username} avatarType={user.avatarType} avatarValue={user.avatarValue} size={32} />
                    <span className="flex-1 text-sm font-semibold text-ink">{user.username}</span>
                    <button type="button" onClick={() => void logout()} className="text-sm font-semibold text-danger">
                      Sign out
                    </button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto border-t border-border-dashed pt-2.5 [scrollbar-width:none]">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={avatarBusy}
                        aria-label={`Use ${preset.id} avatar`}
                        onClick={() => void handlePickPreset(preset.id)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[16px] disabled:opacity-50"
                        style={{ backgroundColor: preset.bg }}
                      >
                        {preset.emoji}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 border-t border-border-dashed pt-2.5">
                    <p className="flex-1 text-[12px] text-ink-muted">
                      {backupStatus === 'syncing'
                        ? 'Syncing…'
                        : backupStatus === 'error'
                          ? 'Sync failed — try again'
                          : lastSyncedAt
                            ? `Backed up ${new Date(lastSyncedAt).toLocaleString()}`
                            : 'Not backed up yet'}
                    </p>
                    <button
                      type="button"
                      disabled={backupStatus === 'syncing'}
                      onClick={() => void backupNow()}
                      className="text-[12.5px] font-semibold text-accent disabled:opacity-50"
                    >
                      Back up now
                    </button>
                    <button
                      type="button"
                      disabled={backupStatus === 'syncing'}
                      onClick={() => void restoreNow()}
                      className="text-[12.5px] font-semibold text-accent disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </div>
                  <div className="flex items-center gap-3 border-t border-border-dashed pt-2.5">
                    <p className="flex-1 text-[12px] text-ink-muted">
                      {resyncState === 'busy'
                        ? 'Resyncing…'
                        : resyncState === 'done'
                          ? "Friends leaderboards updated with this device's history"
                          : resyncState === 'failed'
                            ? 'Resync failed — try again'
                            : "Not showing past solves on the friends leaderboards? Resync this device's history"}
                    </p>
                    <button
                      type="button"
                      disabled={resyncState === 'busy'}
                      onClick={() => void handleResyncHistory()}
                      className="shrink-0 text-[12.5px] font-semibold text-accent disabled:opacity-50"
                    >
                      Resync
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-ink-muted">Not signed in</span>
                  <Link to="/login" onClick={handleClose} className="text-sm font-semibold text-accent">
                    Sign in
                  </Link>
                </div>
              )}
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
              <IconToggleRow icon={<SpeakerIcon size={16} />} label="Sound effects" checked={soundEnabled} onChange={setSoundEnabled} />
              <IconToggleRow icon={<VibrationIcon size={16} />} label="Haptics" checked={hapticsEnabled} onChange={setHapticsEnabled} />
            </div>

            <p className="mb-2 text-sm font-medium text-ink-muted">Gameplay</p>
            <div className="flex flex-col gap-2">
              <IconToggleRow
                icon={<XMarkIcon size={15} />}
                label="Auto-place X's (Queens)"
                checked={autoPlaceX}
                onChange={(enabled) => {
                  setAutoPlaceX(enabled)
                  void setAutoPlaceXDb(enabled)
                }}
              />
              <IconToggleRow
                icon={<TimedIcon size={16} />}
                label="Zen mode — hide timers"
                checked={zenMode}
                onChange={(enabled) => {
                  setZenMode(enabled)
                  void setZenModeDb(enabled)
                }}
              />
            </div>

            <div className="mt-5 border-t border-border-dashed pt-4">
              {!confirmingReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  className="w-full rounded-2xl py-3 text-center text-sm font-semibold text-danger"
                >
                  Reset all progress
                </button>
              ) : (
                <div className="rounded-2xl bg-[oklch(94%_0.04_25)] p-4">
                  <p className="text-[13px] font-semibold text-danger">
                    This clears every game's progress, coins, and skins. This can't be undone.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={resetting}
                      onClick={() => setConfirmingReset(false)}
                      className="flex-1 rounded-full bg-surface py-2.5 text-sm font-semibold text-ink-muted disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={resetting}
                      onClick={handleConfirmReset}
                      className="flex-1 rounded-full bg-danger py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {resetting ? 'Resetting…' : 'Yes, reset everything'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
