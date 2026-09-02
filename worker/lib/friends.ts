import type { Env } from '../types'

/** friendships rows are keyed by a canonical (user_a < user_b) pair — one row covers
 *  both directions instead of two. */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

/** Every accepted friend's id, plus the caller's own — the scope for both leaderboard
 *  queries in worker/routes/scores.ts ("me + my friends", never a global board). */
export async function getFriendIds(env: Env, userId: string): Promise<string[]> {
  const rows = await env.DB.prepare(
    `SELECT CASE WHEN user_a = ?1 THEN user_b ELSE user_a END AS other
     FROM friendships WHERE (user_a = ?1 OR user_b = ?1) AND status = 'accepted'`,
  )
    .bind(userId)
    .all<{ other: string }>()
  return [userId, ...rows.results.map((r) => r.other)]
}
