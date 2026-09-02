import { withAuth, type AuthedContext } from '../lib/auth'
import { errorResponse, json, readJson } from '../lib/http'

const MAX_PAYLOAD_BYTES = 2_000_000 // generous — see backup.ts's plan notes; a real payload is well under this

interface BackupRow {
  payload: string
  updated_at: number
}

interface PutBackupBody {
  payload?: unknown
}

export const handleGetBackup = withAuth(async ({ env, user }: AuthedContext) => {
  const row = await env.DB.prepare('SELECT payload, updated_at FROM backups WHERE user_id = ?').bind(user.id).first<BackupRow>()
  if (!row) return json({ payload: null, updatedAt: null })
  return json({ payload: JSON.parse(row.payload), updatedAt: row.updated_at })
})

export const handlePutBackup = withAuth(async ({ request, env, user }: AuthedContext) => {
  const body = await readJson<PutBackupBody>(request)
  if (!body || body.payload === undefined) return errorResponse('Missing payload')

  const serialized = JSON.stringify(body.payload)
  if (serialized.length > MAX_PAYLOAD_BYTES) return errorResponse('Backup payload too large', 413)

  const now = Date.now()
  await env.DB.prepare(
    `INSERT INTO backups (user_id, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
  )
    .bind(user.id, serialized, now)
    .run()

  return json({ ok: true, updatedAt: now })
})
