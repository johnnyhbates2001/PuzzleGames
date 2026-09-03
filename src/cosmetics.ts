import type { AchievementContext } from './achievements/definitions'
import { ACHIEVEMENTS } from './achievements/definitions'
import { RANKS } from './games/chapters'

/** One item lock kind per shop category — mirrors skins.ts's `Skin['locked']` plus the
 *  two new kinds this expansion introduces (see theme_and_shop_update/README.md):
 *  `achievementId` gates on an AchievementDef.id being satisfied, `endlessRank` gates on
 *  the best Endless rank reached in any game (see games/chapters.ts's RANKS). */
export type CosmeticLock =
  | { solvesNeeded: number }
  | { chapterNeeded: number }
  | { achievementId: string }
  | { endlessRank: string }

export interface CosmeticItem {
  id: string
  name: string
  tag: string
  /** Coin price to buy. null = free (still needs a tap to claim/equip, not auto-owned
   *  unless it's a category's default item). */
  price: number | null
  locked?: CosmeticLock
}

/** The 10 new shop categories from the Shop Expansion handoff — board skins stay on
 *  their own dedicated system (skins.ts) since it already existed and this expansion
 *  only added an `endlessRank` lock kind to it, not a new category key. */
export type CosmeticCategory =
  | 'queensMarker'
  | 'zipLineStyle'
  | 'sudokuDigitStyle'
  | 'patchesBadgeShape'
  | 'nonogramTexture'
  | 'wordleTileStyle'
  | 'confetti'
  | 'celebration'
  | 'soundPack'
  | 'accentTheme'
  | 'iconPack'

export interface CosmeticCategoryDef {
  key: CosmeticCategory
  label: string
  blurb: string
  /** Always "owned"/equippable even if absent from `items` — every category has one
   *  baseline look that predates this expansion (the existing crown/classic digit
   *  font/plain confetti/etc.), so it doesn't need its own purchasable entry. */
  defaultId: string
  items: CosmeticItem[]
}

export const COSMETIC_CATEGORIES: CosmeticCategoryDef[] = [
  {
    key: 'queensMarker',
    label: 'Queens · markers',
    blurb: 'Swap the crown used to mark a queen on the board.',
    defaultId: 'crown',
    items: [
      { id: 'crown', name: 'Crown', tag: 'Default', price: null },
      { id: 'star', name: 'Star', tag: 'Bright & simple', price: 290 },
      { id: 'gem', name: 'Gem', tag: 'Faceted & sharp', price: 390 },
      { id: 'dot', name: 'Dot', tag: 'Minimal', price: 210 },
      { id: 'chess-king', name: 'Chess King', tag: 'Locked · Queens Expert', price: null, locked: { achievementId: 'queens-expert' } },
      { id: 'flame', name: 'Flame', tag: 'Locked · Unstoppable', price: null, locked: { achievementId: 'unstoppable' } },
    ],
  },
  {
    key: 'zipLineStyle',
    label: 'Zip · line styles',
    blurb: 'Alternate styles for the connecting path you draw.',
    defaultId: 'classic',
    items: [
      { id: 'classic', name: 'Classic', tag: 'Default', price: null },
      { id: 'dashed', name: 'Dashed', tag: 'Broken line', price: 230 },
      { id: 'dotted', name: 'Dotted', tag: 'Fine dots', price: 230 },
      { id: 'glow', name: 'Glow', tag: 'Soft luminous line', price: 410 },
      { id: 'braided', name: 'Braided', tag: 'Locked · Chapter 15', price: null, locked: { chapterNeeded: 15 } },
      { id: 'pulse', name: 'Pulse', tag: 'Locked · Zip Expert', price: null, locked: { achievementId: 'zip-expert' } },
    ],
  },
  {
    key: 'sudokuDigitStyle',
    label: 'Sudoku · digit styles',
    blurb: 'How placed numbers look on the grid.',
    defaultId: 'classic',
    items: [
      { id: 'classic', name: 'Classic', tag: 'Default', price: null },
      { id: 'rounded', name: 'Rounded', tag: 'Soft & friendly', price: 260 },
      { id: 'mono', name: 'Mono', tag: 'Typewriter', price: 290 },
      { id: 'serif', name: 'Serif', tag: 'Classic print', price: 240 },
      { id: 'handwritten', name: 'Handwritten', tag: 'Locked · Chapter 9', price: null, locked: { chapterNeeded: 9 } },
      { id: 'neon', name: 'Neon', tag: 'Locked · Sudoku Expert', price: null, locked: { achievementId: 'sudoku-expert' } },
    ],
  },
  {
    key: 'patchesBadgeShape',
    label: 'Patches · badge shapes',
    blurb: 'The silhouette of each clue badge.',
    defaultId: 'classic',
    items: [
      { id: 'classic', name: 'Classic', tag: 'Default', price: null },
      { id: 'circle', name: 'Circle', tag: 'Round', price: 230 },
      { id: 'hexagon', name: 'Hexagon', tag: 'Angular', price: 310 },
      { id: 'star', name: 'Star', tag: 'Five-point', price: 280 },
      { id: 'diamond', name: 'Diamond', tag: 'Locked · Chapter 18', price: null, locked: { chapterNeeded: 18 } },
      { id: 'scallop', name: 'Scallop', tag: 'Locked · Patches Expert', price: null, locked: { achievementId: 'patches-expert' } },
    ],
  },
  {
    key: 'nonogramTexture',
    label: 'Nonogram · fill textures',
    blurb: 'How filled cells render instead of a flat color.',
    defaultId: 'classic',
    items: [
      { id: 'classic', name: 'Classic', tag: 'Default', price: null },
      { id: 'crosshatch', name: 'Crosshatch', tag: 'Woven texture', price: 260 },
      { id: 'dot-grid', name: 'Dot Grid', tag: 'Halftone', price: 260 },
      { id: 'stipple', name: 'Stipple', tag: 'Speckled fill', price: 240 },
      { id: 'gradient', name: 'Gradient', tag: 'Locked · Chapter 21', price: null, locked: { chapterNeeded: 21 } },
      { id: 'glow', name: 'Glow', tag: 'Locked · Nonogram Expert', price: null, locked: { achievementId: 'nonogram-expert' } },
    ],
  },
  {
    key: 'wordleTileStyle',
    label: 'Wordle · tile styles',
    blurb: 'How a submitted guess tile looks and flips.',
    defaultId: 'classic',
    items: [
      { id: 'classic', name: 'Classic', tag: 'Default', price: null },
      { id: 'bold-sans', name: 'Bold Sans', tag: 'Heavy geometric letters', price: 260 },
      { id: 'retro-type', name: 'Retro Type', tag: 'Monospace terminal', price: 230 },
      { id: 'gradient-flip', name: 'Gradient Flip', tag: 'Locked · Chapter 12', price: null, locked: { chapterNeeded: 12 } },
      { id: 'neon-glow', name: 'Neon Glow', tag: 'Locked · Wordle Expert', price: null, locked: { achievementId: 'wordle-expert' } },
    ],
  },
  {
    key: 'confetti',
    label: 'Confetti styles',
    blurb: "Shared across every game's completion screen.",
    defaultId: 'classic',
    items: [
      { id: 'ribbons', name: 'Ribbons', tag: 'Elongated pieces', price: 290 },
      { id: 'fireworks', name: 'Fireworks', tag: 'Radiating burst', price: 340 },
      { id: 'century-burst', name: 'Century Burst', tag: 'Locked · Century', price: null, locked: { achievementId: 'century' } },
      { id: 'puzzle-master-shower', name: 'Puzzle Master Shower', tag: 'Locked · Puzzle Master', price: null, locked: { achievementId: 'puzzle-master' } },
      { id: 'collectors-rain', name: "Collector's Rain", tag: 'Locked · Collector', price: null, locked: { achievementId: 'collector' } },
    ],
  },
  {
    key: 'celebration',
    label: 'Celebration animations',
    blurb: 'The completion-screen moment when a level is finished.',
    defaultId: 'classic',
    items: [
      { id: 'bounce-pop', name: 'Bounce Pop', tag: 'Playful scale-in', price: 260 },
      { id: 'shockwave', name: 'Shockwave', tag: 'Expanding ring', price: 340 },
      { id: 'streak-flame', name: 'Streak Flame', tag: 'Locked · Week Warrior', price: null, locked: { achievementId: 'week-warrior' } },
      { id: 'rocket-launch', name: 'Rocket Launch', tag: 'Locked · Unstoppable', price: null, locked: { achievementId: 'unstoppable' } },
    ],
  },
  {
    key: 'soundPack',
    label: 'Sound packs',
    blurb: 'Replaces the tap/place/solve SFX set.',
    defaultId: 'classic',
    items: [
      { id: 'retro-8bit', name: 'Retro 8-bit', tag: 'Chiptune blips', price: 260 },
      { id: 'chimes', name: 'Chimes', tag: 'Soft bell tones', price: 290 },
      { id: 'unstoppable-beat', name: 'Unstoppable Beat', tag: 'Locked · Unstoppable', price: null, locked: { achievementId: 'unstoppable' } },
      { id: 'flawless-hush', name: 'Flawless Hush', tag: 'Locked · Flawless', price: null, locked: { achievementId: 'flawless' } },
    ],
  },
  {
    key: 'accentTheme',
    label: 'Accent themes',
    blurb: 'App-wide button & highlight color, separate from board skins.',
    defaultId: 'violet',
    items: [
      { id: 'coral', name: 'Coral', tag: 'Warm coral accent', price: 290 },
      { id: 'emerald', name: 'Emerald', tag: 'Cool green accent', price: 290 },
      { id: 'sky', name: 'Sky', tag: 'Bright blue accent', price: 310 },
      { id: 'rose', name: 'Rose', tag: 'Deep pink accent', price: 310 },
      // Rank-gated *and* coin-priced (see skins.ts's eclipse/coastal/wildfire for the
      // same treatment) — the tag describes the theme itself since it becomes the
      // tile's regular subtitle once unlocked, not a permanent "Locked" label.
      { id: 'diamond-chrome', name: 'Diamond Chrome', tag: 'Icy chrome accent', price: 450, locked: { endlessRank: 'Diamond' } },
      { id: 'master-gold', name: 'Master Gold', tag: 'Rich gold accent', price: 600, locked: { endlessRank: 'Master' } },
    ],
  },
  {
    key: 'iconPack',
    label: 'App icon packs',
    blurb: 'Alternate home-screen icons.',
    defaultId: 'classic',
    items: [
      { id: 'retro-arcade', name: 'Retro Arcade', tag: 'Striped neon', price: 330 },
      { id: 'minimal-mono', name: 'Minimal Mono', tag: 'Black & white', price: 290 },
      { id: 'all-rounder', name: 'All-Rounder', tag: 'Locked · All-Rounder', price: null, locked: { achievementId: 'all-rounder' } },
      { id: 'puzzle-master', name: 'Puzzle Master', tag: 'Locked · Puzzle Master', price: null, locked: { achievementId: 'puzzle-master' } },
    ],
  },
]

export function getCosmeticCategory(key: CosmeticCategory): CosmeticCategoryDef {
  const def = COSMETIC_CATEGORIES.find((c) => c.key === key)
  if (!def) throw new Error(`Unknown cosmetic category: ${key}`)
  return def
}

/** Context needed to evaluate every CosmeticLock kind — see isCosmeticLocked. */
export interface CosmeticUnlockContext {
  totalSolved: number
  highestChapter: number
  achievementCtx: AchievementContext
  /** RANKS index of the best Endless rank reached in any game; -1 if none yet. */
  highestEndlessRankIndex: number
}

/** A lock's `endlessRank` may name an exact RANKS entry ('Master I') or a tier prefix
 *  ('Master', matching 'Master I'..'Master V') — accent themes use the tier form since
 *  their copy just says "Master rank", board skins use the exact form. */
function endlessRankIndexFor(name: string): number {
  const exact = RANKS.indexOf(name)
  if (exact !== -1) return exact
  return RANKS.findIndex((r) => r.startsWith(name))
}

export function isCosmeticLocked(locked: CosmeticLock, ctx: CosmeticUnlockContext): boolean {
  if ('solvesNeeded' in locked) return ctx.totalSolved < locked.solvesNeeded
  if ('chapterNeeded' in locked) return ctx.highestChapter < locked.chapterNeeded
  if ('achievementId' in locked) {
    const def = ACHIEVEMENTS.find((a) => a.id === locked.achievementId)
    return !def || !def.check(ctx.achievementCtx)
  }
  const rankIndex = endlessRankIndexFor(locked.endlessRank)
  return rankIndex === -1 || ctx.highestEndlessRankIndex < rankIndex
}

export function cosmeticLockLabel(locked: CosmeticLock): string {
  if ('solvesNeeded' in locked) return `Locked · ${locked.solvesNeeded} solves`
  if ('chapterNeeded' in locked) return `Locked · Chapter ${locked.chapterNeeded}`
  if ('achievementId' in locked) {
    const def = ACHIEVEMENTS.find((a) => a.id === locked.achievementId)
    return `Locked · ${def?.title ?? locked.achievementId}`
  }
  return `Locked · Endless ${locked.endlessRank} rank`
}
