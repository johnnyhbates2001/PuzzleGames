import type { Env } from '../types'

const SIGNUPS_PER_IP_PER_DAY = 10

function dateKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

/** Cheap per-IP-per-day counter — this exists to blunt a stray bot crawl hitting
 *  the signup endpoint, not to manage load (see the plan: quota headroom at this
 *  app's scale is ~1000x). Returns false once the day's cap is hit. */
export async function allowSignup(env: Env, ip: string): Promise<boolean> {
  const key = dateKey(Date.now())
  const row = await env.DB.prepare('SELECT count FROM signup_attempts WHERE ip = ? AND date_key = ?').bind(ip, key).first<{
    count: number
  }>()
  if (row && row.count >= SIGNUPS_PER_IP_PER_DAY) return false

  await env.DB.prepare(
    `INSERT INTO signup_attempts (ip, date_key, count) VALUES (?, ?, 1)
     ON CONFLICT (ip, date_key) DO UPDATE SET count = count + 1`,
  )
    .bind(ip, key)
    .run()
  return true
}
