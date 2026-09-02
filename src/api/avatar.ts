import { apiPatch } from './client'

export function setPresetAvatar(presetId: string): Promise<{ ok: boolean; avatarType: string; avatarValue: string }> {
  return apiPatch('/me/avatar', { type: 'preset', value: presetId })
}
