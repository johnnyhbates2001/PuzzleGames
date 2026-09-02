import type { PublicUser, UserRow } from '../types'
import { withAuth, type AuthedContext } from '../lib/auth'
import { errorResponse, json, readJson } from '../lib/http'
import { canonicalPair } from '../lib/friends'

interface FriendshipRow {
  id: string
  username: string
  avatar_type: string
  avatar_value: string
  status: 'pending' | 'accepted'
  requested_by: string
}

export const handleListFriends = withAuth(async ({ env, user }: AuthedContext) => {
  const rows = await env.DB.prepare(
    `SELECT u.id, u.username, u.avatar_type, u.avatar_value, f.status, f.requested_by
     FROM friendships f
     JOIN users u ON u.id = (CASE WHEN f.user_a = ?1 THEN f.user_b ELSE f.user_a END)
     WHERE f.user_a = ?1 OR f.user_b = ?1
     ORDER BY u.username COLLATE NOCASE`,
  )
    .bind(user.id)
    .all<FriendshipRow>()

  const friends: PublicUser[] = []
  const incoming: PublicUser[] = []
  const outgoing: PublicUser[] = []

  for (const row of rows.results) {
    const publicUser: PublicUser = {
      id: row.id,
      username: row.username,
      avatarType: row.avatar_type,
      avatarValue: row.avatar_value,
    }
    if (row.status === 'accepted') friends.push(publicUser)
    else if (row.requested_by === user.id) outgoing.push(publicUser)
    else incoming.push(publicUser)
  }

  return json({ friends, incoming, outgoing })
})

interface FriendRequestBody {
  username?: string
}

export const handleFriendRequest = withAuth(async ({ request, env, user }: AuthedContext) => {
  const body = await readJson<FriendRequestBody>(request)
  if (!body?.username) return errorResponse('Username is required')

  const target = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(body.username).first<UserRow>()
  if (!target) return errorResponse('No user with that username', 404)
  if (target.id === user.id) return errorResponse("You can't friend yourself")

  const [userA, userB] = canonicalPair(user.id, target.id)
  const existing = await env.DB.prepare('SELECT status, requested_by FROM friendships WHERE user_a = ? AND user_b = ?')
    .bind(userA, userB)
    .first<{ status: string; requested_by: string }>()

  if (existing?.status === 'accepted') return errorResponse('Already friends', 409)

  if (existing?.status === 'pending' && existing.requested_by !== user.id) {
    // They'd already requested you — this request is mutual, so just accept it.
    await env.DB.prepare('UPDATE friendships SET status = ? WHERE user_a = ? AND user_b = ?').bind('accepted', userA, userB).run()
    return json({ status: 'accepted' })
  }

  if (existing?.status === 'pending') return errorResponse('Request already sent', 409)

  await env.DB.prepare('INSERT INTO friendships (user_a, user_b, status, requested_by, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(userA, userB, 'pending', user.id, Date.now())
    .run()
  return json({ status: 'pending' })
})

interface FriendRespondBody {
  username?: string
  accept?: boolean
}

export const handleFriendRespond = withAuth(async ({ request, env, user }: AuthedContext) => {
  const body = await readJson<FriendRespondBody>(request)
  if (!body?.username || typeof body.accept !== 'boolean') return errorResponse('Username and accept are required')

  const other = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(body.username).first<{ id: string }>()
  if (!other) return errorResponse('No user with that username', 404)

  const [userA, userB] = canonicalPair(user.id, other.id)
  const existing = await env.DB.prepare('SELECT status, requested_by FROM friendships WHERE user_a = ? AND user_b = ?')
    .bind(userA, userB)
    .first<{ status: string; requested_by: string }>()

  if (!existing || existing.status !== 'pending' || existing.requested_by === user.id) {
    return errorResponse('No pending request from that user', 404)
  }

  if (body.accept) {
    await env.DB.prepare('UPDATE friendships SET status = ? WHERE user_a = ? AND user_b = ?').bind('accepted', userA, userB).run()
  } else {
    await env.DB.prepare('DELETE FROM friendships WHERE user_a = ? AND user_b = ?').bind(userA, userB).run()
  }
  return json({ ok: true })
})

export const handleRemoveFriend = withAuth(async ({ env, user, params }: AuthedContext) => {
  const other = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(params.username).first<{ id: string }>()
  if (!other) return errorResponse('No user with that username', 404)

  const [userA, userB] = canonicalPair(user.id, other.id)
  await env.DB.prepare('DELETE FROM friendships WHERE user_a = ? AND user_b = ?').bind(userA, userB).run()
  return json({ ok: true })
})
