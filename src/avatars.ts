export interface AvatarPreset {
  id: string
  emoji: string
  bg: string
  /** Coin price to buy — undefined for the original free set (kept undefined rather
   *  than null so a plain truthiness check works without importing Skin's null-means-
   *  free convention here too). See storage/db.ts's buyAvatarPreset/Settings.ownedAvatars. */
  price?: number
  locked?: { achievementId: string }
}

/** A small curated set rather than arbitrary uploads-only — see worker/lib/avatars.ts,
 *  which mirrors these ids server-side. Emoji + a flat color keeps this asset-free
 *  (no images to bundle or fetch for the common case). The first six are free/default;
 *  everything after is a coin-purchasable or achievement-locked addition (see the Shop
 *  Boosts/avatars economy pass — Settings.ownedAvatars tracks the purchased ones). */
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'fox', emoji: '🦊', bg: 'oklch(80% 0.12 55)' },
  { id: 'cat', emoji: '🐱', bg: 'oklch(80% 0.1 280)' },
  { id: 'owl', emoji: '🦉', bg: 'oklch(78% 0.09 95)' },
  { id: 'panda', emoji: '🐼', bg: 'oklch(85% 0.02 250)' },
  { id: 'rabbit', emoji: '🐰', bg: 'oklch(85% 0.06 340)' },
  { id: 'koala', emoji: '🐨', bg: 'oklch(82% 0.03 230)' },
  { id: 'penguin', emoji: '🐧', bg: 'oklch(75% 0.05 240)', price: 200 },
  { id: 'dragon', emoji: '🐉', bg: 'oklch(78% 0.1 150)', price: 260 },
  { id: 'unicorn', emoji: '🦄', bg: 'oklch(85% 0.08 320)', price: 260 },
  { id: 'lion', emoji: '🦁', bg: 'oklch(82% 0.1 75)', price: 220 },
  { id: 'octopus', emoji: '🐙', bg: 'oklch(78% 0.1 20)', locked: { achievementId: 'puzzle-master' } },
  { id: 'crown', emoji: '👑', bg: 'oklch(85% 0.1 85)', locked: { achievementId: 'unstoppable' } },
]

export const DEFAULT_AVATAR_PRESET_ID = 'fox'

export function getAvatarPreset(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((p) => p.id === id)
}
