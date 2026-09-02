import { withAuth, type AuthedContext } from '../lib/auth'
import { errorResponse, json, readJson } from '../lib/http'
import { isAvatarPresetId } from '../lib/avatars'

interface PatchAvatarBody {
  type?: string
  value?: string
}

export const handlePatchAvatar = withAuth(async ({ request, env, user }: AuthedContext) => {
  const body = await readJson<PatchAvatarBody>(request)
  if (body?.type !== 'preset' || !isAvatarPresetId(body.value)) return errorResponse('Unknown avatar preset')

  await env.DB.prepare('UPDATE users SET avatar_type = ?, avatar_value = ? WHERE id = ?').bind('preset', body.value, user.id).run()
  return json({ ok: true, avatarType: 'preset', avatarValue: body.value })
})
