import type { Env, UserRow } from '../types'
import type { Handler, RouteContext } from './router'
import { errorResponse } from './http'
import { generateSessionToken } from './crypto'
import { readSessionCookie, SESSION_MAX_AGE_SECONDS } from './cookies'

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = generateSessionToken()
  const now = Date.now()
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, now, now + SESSION_MAX_AGE_SECONDS * 1000)
    .run()
  return token
}

export async function deleteSession(env: Env, token: string): Promise<void> {
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
}

/** How stale a session may get before GET /me slides its expiry forward — once a
 *  day at most, so an app opened daily never hits the 30-day cutoff (a silent
 *  sign-out quietly stops daily scores from syncing) without a write per request. */
const SESSION_RENEW_AFTER_MS = 24 * 60 * 60 * 1000

/** Pushes this request's session expiry back out to the full max age if it was last
 *  set more than SESSION_RENEW_AFTER_MS ago. Returns the token when it renewed, so
 *  the caller can re-send the cookie with a fresh Max-Age too; null otherwise. */
export async function renewSessionIfStale(request: Request, env: Env): Promise<string | null> {
  const token = readSessionCookie(request)
  if (!token) return null
  const now = Date.now()
  const fullExpiry = now + SESSION_MAX_AGE_SECONDS * 1000
  const result = await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token = ? AND expires_at > ? AND expires_at < ?')
    .bind(fullExpiry, token, now, fullExpiry - SESSION_RENEW_AFTER_MS)
    .run()
  return result.meta.changes > 0 ? token : null
}

/** Returns the signed-in user for this request, or null if there's no session
 *  cookie, the session doesn't exist, or it's expired (expired rows are lazily
 *  swept here rather than needing a cron). */
export async function getUserFromRequest(request: Request, env: Env): Promise<UserRow | null> {
  const token = readSessionCookie(request)
  if (!token) return null

  const row = await env.DB.prepare(
    `SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ? AND sessions.expires_at > ?`,
  )
    .bind(token, Date.now())
    .first<UserRow>()

  return row ?? null
}

export type AuthedContext = RouteContext & { user: UserRow }
type AuthedHandler = (ctx: AuthedContext) => Promise<Response> | Response

/** Wraps a route handler so it only runs for a signed-in caller — everything under
 *  /api/friends, /api/scores, /api/backup, and /api/me/* needs this. */
export function withAuth(handler: AuthedHandler): Handler {
  return async (ctx) => {
    const user = await getUserFromRequest(ctx.request, ctx.env)
    if (!user) return errorResponse('Not signed in', 401)
    return handler({ ...ctx, user })
  }
}
