// Mirrors src/avatars.ts's AVATAR_PRESETS ids — duplicated for the same reason as
// worker/lib/games.ts (the Worker and the app bundle are separate TS projects with
// no shared runtime code between them).
export const AVATAR_PRESET_IDS = ['fox', 'cat', 'owl', 'panda', 'rabbit', 'koala'] as const
export const DEFAULT_AVATAR_PRESET_ID: (typeof AVATAR_PRESET_IDS)[number] = 'fox'

export function isAvatarPresetId(value: unknown): value is (typeof AVATAR_PRESET_IDS)[number] {
  return typeof value === 'string' && (AVATAR_PRESET_IDS as readonly string[]).includes(value)
}
