// Mirrors src/avatars.ts's AVATAR_PRESETS ids — duplicated for the same reason as
// worker/lib/games.ts (the Worker and the app bundle are separate TS projects with
// no shared runtime code between them). Includes the coin-purchased/achievement-locked
// ids too — the Worker only validates that a preset id is a recognized one, it doesn't
// (and can't, having no view into local coin/achievement state) check the client
// actually unlocked it, same trust model as every other client-tracked unlock here.
export const AVATAR_PRESET_IDS = [
  'fox',
  'cat',
  'owl',
  'panda',
  'rabbit',
  'koala',
  'penguin',
  'dragon',
  'unicorn',
  'lion',
  'octopus',
  'crown',
] as const
export const DEFAULT_AVATAR_PRESET_ID: (typeof AVATAR_PRESET_IDS)[number] = 'fox'

export function isAvatarPresetId(value: unknown): value is (typeof AVATAR_PRESET_IDS)[number] {
  return typeof value === 'string' && (AVATAR_PRESET_IDS as readonly string[]).includes(value)
}
