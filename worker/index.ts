import type { Env } from './types'
import { Router } from './lib/router'
import { json } from './lib/http'
import { handleLogin, handleLogout, handleMe, handleRecover, handleSignup } from './routes/auth'
import { handleGetBackup, handlePutBackup } from './routes/backup'
import { handleFriendRequest, handleFriendRespond, handleListFriends, handleRemoveFriend } from './routes/friends'
import {
  handleGetDailyLeaderboard,
  handleGetGameLeaderboard,
  handlePostDailyScore,
  handlePostGameScore,
  handlePostScoreBackfill,
} from './routes/scores'
import { handlePatchAvatar } from './routes/avatar'

const router = new Router()

router.get('/api/health', async ({ env }) => {
  const row = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
  return json({ ok: row?.ok === 1 })
})

router.post('/api/auth/signup', handleSignup)
router.post('/api/auth/login', handleLogin)
router.post('/api/auth/logout', handleLogout)
router.post('/api/auth/recover', handleRecover)
router.get('/api/me', handleMe)

router.get('/api/backup', handleGetBackup)
router.post('/api/backup', handlePutBackup)

router.get('/api/friends', handleListFriends)
router.post('/api/friends/request', handleFriendRequest)
router.post('/api/friends/respond', handleFriendRespond)
router.delete('/api/friends/:username', handleRemoveFriend)

router.post('/api/scores/daily', handlePostDailyScore)
router.get('/api/leaderboard/daily/:gameId/:dateKey', handleGetDailyLeaderboard)
router.post('/api/scores/game', handlePostGameScore)
router.get('/api/leaderboard/game/:gameId', handleGetGameLeaderboard)
router.post('/api/scores/backfill', handlePostScoreBackfill)

router.patch('/api/me/avatar', handlePatchAvatar)

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const match = router.match(request.method, url.pathname)
    if (!match) return json({ error: 'Not found' }, { status: 404 })
    try {
      return await match.handler({ request, env, url, params: match.params })
    } catch (error) {
      console.error(error)
      return json({ error: 'Internal error' }, { status: 500 })
    }
  },
} satisfies ExportedHandler<Env>
