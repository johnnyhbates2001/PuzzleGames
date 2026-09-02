export interface AvatarPreset {
  id: string
  emoji: string
  bg: string
}

/** A small curated set rather than arbitrary uploads-only — see worker/lib/avatars.ts,
 *  which mirrors these ids server-side. Emoji + a flat color keeps this asset-free
 *  (no images to bundle or fetch for the common case). */
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'fox', emoji: '🦊', bg: 'oklch(80% 0.12 55)' },
  { id: 'cat', emoji: '🐱', bg: 'oklch(80% 0.1 280)' },
  { id: 'owl', emoji: '🦉', bg: 'oklch(78% 0.09 95)' },
  { id: 'panda', emoji: '🐼', bg: 'oklch(85% 0.02 250)' },
  { id: 'rabbit', emoji: '🐰', bg: 'oklch(85% 0.06 340)' },
  { id: 'koala', emoji: '🐨', bg: 'oklch(82% 0.03 230)' },
]

export const DEFAULT_AVATAR_PRESET_ID = 'fox'

export function getAvatarPreset(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.id === id)
}
