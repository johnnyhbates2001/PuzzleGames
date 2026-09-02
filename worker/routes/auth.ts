import type { UserRow } from '../types'
import { toPublicUser } from '../types'
import type { RouteContext } from '../lib/router'
import { errorResponse, json, readJson } from '../lib/http'
import { generateId, generateRecoveryCode, hashPassword, hashRecoveryCode, verifyPassword, verifyRecoveryCode } from '../lib/crypto'
import { createSession, deleteSession, getUserFromRequest } from '../lib/auth'
import { clearSessionCookie, setSessionCookie } from '../lib/cookies'
import { allowSignup } from '../lib/rateLimit'
import { isValidPassword, isValidUsername } from '../lib/validate'
import { DEFAULT_AVATAR_PRESET_ID } from '../lib/avatars'

interface SignupBody {
  username?: string
  password?: string
}

export async function handleSignup({ request, env, url }: RouteContext): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  if (!(await allowSignup(env, ip))) return errorResponse('Too many accounts created from this network today', 429)

  const body = await readJson<SignupBody>(request)
  if (!body || !isValidUsername(body.username)) {
    return errorResponse('Username must be 3-20 characters: letters, numbers, underscore')
  }
  if (!isValidPassword(body.password)) return errorResponse('Password must be at least 8 characters')

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(body.username).first()
  if (existing) return errorResponse('That username is taken', 409)

  const { hash: passwordHash, salt: passwordSalt } = await hashPassword(body.password)
  const recoveryCode = generateRecoveryCode()
  const recoveryCodeHash = await hashRecoveryCode(recoveryCode)
  const id = generateId()
  const now = Date.now()

  try {
    await env.DB.prepare(
      `INSERT INTO users (id, username, password_hash, password_salt, recovery_code_hash, avatar_type, avatar_value, created_at)
       VALUES (?, ?, ?, ?, ?, 'preset', ?, ?)`,
    )
      .bind(id, body.username, passwordHash, passwordSalt, recoveryCodeHash, DEFAULT_AVATAR_PRESET_ID, now)
      .run()
  } catch {
    return errorResponse('That username is taken', 409)
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
  const token = await createSession(env, id)

  return json(
    { user: toPublicUser(user!), recoveryCode },
    { headers: { 'Set-Cookie': setSessionCookie(url, token) } },
  )
}

interface LoginBody {
  username?: string
  password?: string
}

export async function handleLogin({ request, env, url }: RouteContext): Promise<Response> {
  const body = await readJson<LoginBody>(request)
  if (!body?.username || !body.password) return errorResponse('Username and password are required')

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(body.username).first<UserRow>()
  const invalid = errorResponse('Invalid username or password', 401)
  if (!user) return invalid
  if (!(await verifyPassword(body.password, user.password_hash, user.password_salt))) return invalid

  const token = await createSession(env, user.id)
  return json({ user: toPublicUser(user) }, { headers: { 'Set-Cookie': setSessionCookie(url, token) } })
}

export async function handleLogout({ request, env, url }: RouteContext): Promise<Response> {
  const cookie = request.headers.get('Cookie')
  const token = cookie?.match(/(?:^|;\s*)session=([^;]+)/)?.[1]
  if (token) await deleteSession(env, decodeURIComponent(token))
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie(url) } })
}

interface RecoverBody {
  username?: string
  recoveryCode?: string
  newPassword?: string
}

export async function handleRecover({ request, env, url }: RouteContext): Promise<Response> {
  const body = await readJson<RecoverBody>(request)
  if (!body?.username || !body.recoveryCode || !isValidPassword(body.newPassword)) {
    return errorResponse('Username, recovery code, and a new password (8+ characters) are required')
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(body.username).first<UserRow>()
  const invalid = errorResponse('Invalid username or recovery code', 401)
  if (!user) return invalid
  if (!(await verifyRecoveryCode(body.recoveryCode, user.recovery_code_hash))) return invalid

  const { hash: passwordHash, salt: passwordSalt } = await hashPassword(body.newPassword!)
  const nextRecoveryCode = generateRecoveryCode()
  const nextRecoveryCodeHash = await hashRecoveryCode(nextRecoveryCode)

  await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, recovery_code_hash = ? WHERE id = ?')
    .bind(passwordHash, passwordSalt, nextRecoveryCodeHash, user.id)
    .run()

  const token = await createSession(env, user.id)
  return json(
    { user: toPublicUser({ ...user, password_hash: passwordHash, password_salt: passwordSalt }), recoveryCode: nextRecoveryCode },
    { headers: { 'Set-Cookie': setSessionCookie(url, token) } },
  )
}

export async function handleMe({ request, env }: RouteContext): Promise<Response> {
  const user = await getUserFromRequest(request, env)
  if (!user) return errorResponse('Not signed in', 401)
  return json({ user: toPublicUser(user) })
}
