import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './useAuth'
import { fetchCloudBackup, pullBackup, pushBackup } from '../sync/backup'
import { backfillLeaderboardStats } from '../sync/backfill'
import { getSettings, getTotalSolved } from '../storage/db'
import type { BackupSnapshot } from '../storage/db'

const AUTO_BACKUP_MIN_INTERVAL_MS = 60_000

interface PendingConflict {
  cloudUpdatedAt: number
  cloudPayload: BackupSnapshot
}

interface BackupContextValue {
  status: 'idle' | 'syncing' | 'error'
  lastSyncedAt: number | null
  /** Set when this device has un-synced local progress *and* the account already has
   *  a different backup — the player has to pick one, see resolveConflict. */
  conflict: PendingConflict | null
  backupNow: () => Promise<void>
  restoreNow: () => Promise<void>
  resolveConflict: (choice: 'local' | 'cloud') => Promise<void>
  /** Manually re-runs the leaderboard backfill (see src/sync/backfill.ts) — the
   *  automatic run (below) only fires once, right when a device first links to an
   *  account, and fails silently if it hits a snag. This is the escape hatch: safe
   *  to call anytime, as many times as needed, since the backend only ever raises
   *  game_stats and never overwrites an existing daily_scores row. */
  resyncHistory: () => Promise<boolean>
}

const BackupContext = createContext<BackupContextValue | null>(null)

/** Reconciles local IndexedDB with the account's cloud backup once per sign-in (see
 *  storage/db.ts's Settings.linkedAccountId), then keeps them loosely in sync via a
 *  debounced auto-backup on visibility/online changes. Only ever active when signed
 *  in — solo local play is entirely unaffected by any of this. */
export function BackupProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<'idle' | 'syncing' | 'error'>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [conflict, setConflict] = useState<PendingConflict | null>(null)
  const lastAutoBackupRef = useRef(0)

  // Reconcile once per sign-in.
  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false
    ;(async () => {
      const settings = await getSettings()
      if (cancelled || settings.linkedAccountId === user.id) return

      setStatus('syncing')
      const cloud = await fetchCloudBackup()
      if (cancelled) return

      if (!cloud.payload) {
        await pushBackup(user.id)
        // Best-effort and non-blocking — a brand-new account has nothing in
        // game_stats/daily_scores yet, so this is the one moment worth seeding them
        // from local history (see src/sync/backfill.ts). A failure here shouldn't
        // block the backup itself, which already succeeded above — logged rather than
        // silently dropped, and re-runnable anytime via resyncHistory (Settings).
        void backfillLeaderboardStats().catch((error: unknown) => console.error('Leaderboard backfill failed', error))
        if (!cancelled) {
          setLastSyncedAt(Date.now())
          setStatus('idle')
        }
        return
      }

      const totalSolved = await getTotalSolved()
      if (cancelled) return

      if (totalSolved === 0) {
        // Nothing local worth keeping — adopt the account's saved state.
        await pullBackup(user.id, cloud.payload)
        if (!cancelled) window.location.reload()
        return
      }

      setConflict({ cloudUpdatedAt: cloud.updatedAt!, cloudPayload: cloud.payload })
      setStatus('idle')
    })()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  const backupNow = useCallback(async () => {
    if (!user) return
    setStatus('syncing')
    try {
      await pushBackup(user.id)
      setLastSyncedAt(Date.now())
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }, [user])

  const restoreNow = useCallback(async () => {
    if (!user) return
    setStatus('syncing')
    try {
      const cloud = await fetchCloudBackup()
      if (cloud.payload) {
        await pullBackup(user.id, cloud.payload)
        window.location.reload()
        return
      }
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }, [user])

  const resyncHistory = useCallback(async () => {
    if (!user) return false
    try {
      await backfillLeaderboardStats()
      return true
    } catch (error) {
      console.error('Leaderboard backfill failed', error)
      return false
    }
  }, [user])

  const resolveConflict = useCallback(
    async (choice: 'local' | 'cloud') => {
      if (!conflict || !user) return
      if (choice === 'local') {
        await pushBackup(user.id)
        void backfillLeaderboardStats().catch((error: unknown) => console.error('Leaderboard backfill failed', error))
        setConflict(null)
        setLastSyncedAt(Date.now())
      } else {
        await pullBackup(user.id, conflict.cloudPayload)
        window.location.reload()
      }
    },
    [conflict, user],
  )

  // Debounced auto-backup — a session-close/reconnect safety net, not a live sync.
  useEffect(() => {
    if (!user || conflict) return

    function maybeBackup() {
      const now = Date.now()
      if (now - lastAutoBackupRef.current < AUTO_BACKUP_MIN_INTERVAL_MS) return
      lastAutoBackupRef.current = now
      void pushBackup(user!.id).then(() => setLastSyncedAt(Date.now()), () => {})
    }
    function handleVisibility() {
      if (document.hidden) maybeBackup()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', maybeBackup)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', maybeBackup)
    }
  }, [user, conflict])

  return (
    <BackupContext.Provider value={{ status, lastSyncedAt, conflict, backupNow, restoreNow, resolveConflict, resyncHistory }}>
      {children}
    </BackupContext.Provider>
  )
}

export function useBackupSync(): BackupContextValue {
  const ctx = useContext(BackupContext)
  if (!ctx) throw new Error('useBackupSync must be used within a BackupProvider')
  return ctx
}
