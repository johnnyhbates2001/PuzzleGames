import { useState } from 'react'
import { useBackupSync } from '../hooks/useBackupSync'

/** Deliberately non-dismissable (no backdrop-tap/drag close, unlike every other sheet
 *  in this app) — silently picking a side for the player would risk quietly discarding
 *  real progress on one of the two devices, so this blocks until they choose. */
export function BackupConflictSheet() {
  const { conflict, resolveConflict } = useBackupSync()
  const [choosing, setChoosing] = useState<'local' | 'cloud' | null>(null)

  if (!conflict) return null

  async function choose(choice: 'local' | 'cloud') {
    setChoosing(choice)
    await resolveConflict(choice)
    setChoosing(null)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card sm:rounded-3xl">
        <h2 className="font-display text-lg font-bold text-ink">Which progress do you want to keep?</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-muted">
          This device has puzzle progress that's different from what's saved to your account. Pick one — the other
          will be replaced.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={!!choosing}
            onClick={() => choose('local')}
            className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {choosing === 'local' ? 'Saving…' : "Use this device's progress"}
          </button>
          <button
            type="button"
            disabled={!!choosing}
            onClick={() => choose('cloud')}
            className="w-full rounded-2xl bg-bg py-3 text-sm font-semibold text-ink-muted disabled:opacity-60"
          >
            {choosing === 'cloud' ? 'Restoring…' : "Use my account's saved progress"}
          </button>
        </div>
      </div>
    </div>
  )
}
