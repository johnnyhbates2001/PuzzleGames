import { apiGet, apiPost } from '../api/client'
import { exportBackupSnapshot, importBackupSnapshot, setLinkedAccountId, type BackupSnapshot } from '../storage/db'

interface BackupResponse {
  payload: BackupSnapshot | null
  updatedAt: number | null
}

export async function fetchCloudBackup(): Promise<BackupResponse> {
  return apiGet<BackupResponse>('/backup')
}

/** Pushes this device's full local state to the account, overwriting whatever was
 *  there. Marks this device as reconciled with `accountId` so a later sign-in here
 *  skips the local-vs-cloud conflict prompt. */
export async function pushBackup(accountId: string): Promise<void> {
  const snapshot = await exportBackupSnapshot()
  await apiPost('/backup', { payload: snapshot })
  await setLinkedAccountId(accountId)
}

/** Pulls the account's saved state and overwrites this device's local IndexedDB with
 *  it. Marks this device as reconciled with `accountId`, same as pushBackup. */
export async function pullBackup(accountId: string, snapshot: BackupSnapshot): Promise<void> {
  await importBackupSnapshot(snapshot)
  await setLinkedAccountId(accountId)
}
