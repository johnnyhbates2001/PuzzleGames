export interface Skin {
  id: string
  name: string
  tag: string
  /** Palette indexed by region id, cycled via `% colors.length` wherever it's consumed
   *  (Board.tsx, PatchesBoard.tsx, GridPreview.tsx) — doesn't need to be region-count-sized. */
  colors: string[]
  /** Coin price to buy. null = free (still needs equipping, not auto-owned). */
  price: number | null
  /** Gated behind a total solve-count, a story-chapter milestone (reached in any game),
   *  or an Endless rank (reached in any game's hard difficulty — see games/chapters.ts's
   *  RANKS/getHighestEndlessRankIndex) instead of coins. */
  locked?: { solvesNeeded: number } | { chapterNeeded: number } | { endlessRank: string }
}

export const DEFAULT_SKIN_ID = 'candy'

export const SKINS: Skin[] = [
  {
    id: 'candy',
    name: 'Candy',
    tag: 'Default',
    price: null,
    // The original REGION_COLORS palette, verbatim — Candy is the pre-skins look.
    colors: ['#FCA5A5', '#FDBA74', '#FDE68A', '#86EFAC', '#5EEAD4', '#7DD3FC', '#A5B4FC', '#D8B4FE', '#F9A8D4', '#D4D4D8'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    tag: 'Deep blues',
    price: null,
    colors: ['#1E293B', '#334155', '#475569', '#0F172A', '#64748B', '#1E3A5F'],
  },
  {
    id: 'sunset',
    name: 'Sunset',
    tag: 'Warm gradient',
    price: 390,
    colors: ['#FDBA74', '#FB7185', '#F9A8D4', '#FCD34D', '#F87171', '#FDE68A'],
  },
  {
    id: 'mono-ink',
    name: 'Mono Ink',
    tag: 'Greyscale',
    price: 320,
    colors: ['#E4E4E7', '#A1A1AA', '#71717A', '#D4D4D8', '#52525B', '#F4F4F5'],
  },
  {
    id: 'forest',
    name: 'Forest',
    tag: 'Mossy greens',
    price: 520,
    colors: ['#86EFAC', '#4ADE80', '#A7F3D0', '#34D399', '#BBF7D0', '#6EE7B7'],
  },
  {
    id: 'vino',
    name: 'Vino',
    tag: 'Croatian wine country',
    price: 450,
    colors: ['#7B1E3D', '#C9A227', '#5B6F55', '#2D5D7B', '#A63446', '#E8C170'],
  },
  {
    id: 'neon',
    name: 'Neon',
    tag: 'Locked · 30 solves',
    price: null,
    locked: { solvesNeeded: 30 },
    colors: ['#2E1065', '#7C3AED', '#DB2777', '#0EA5E9', '#4C1D95', '#F472B6'],
  },
  // Chapter-reward skins — free, earned by reaching a milestone chapter (every 3rd) in
  // any game, never purchasable. See games/chapters.ts CHAPTER_META for the pairing.
  {
    id: 'garden',
    name: 'Garden',
    tag: 'Fresh greens',
    price: null,
    locked: { chapterNeeded: 3 },
    colors: ['#BEF264', '#86EFAC', '#FDE68A', '#FCA5A5', '#A7F3D0', '#D9F99D'],
  },
  {
    id: 'river',
    name: 'River',
    tag: 'Cool blues',
    price: null,
    locked: { chapterNeeded: 6 },
    colors: ['#7DD3FC', '#5EEAD4', '#38BDF8', '#A5F3FC', '#0EA5E9', '#99F6E4'],
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    tag: 'Warm evening light',
    price: null,
    locked: { chapterNeeded: 9 },
    colors: ['#FDBA74', '#FCD34D', '#FB923C', '#FDE047', '#F59E0B', '#FED7AA'],
  },
  {
    id: 'desert-bloom',
    name: 'Desert Bloom',
    tag: 'Sandy terracotta',
    price: null,
    locked: { chapterNeeded: 12 },
    colors: ['#E7C6A5', '#D97757', '#C2703D', '#F1DCC2', '#B45309', '#EAB989'],
  },
  {
    id: 'starlit',
    name: 'Starlit',
    tag: 'Deep night purples',
    price: null,
    locked: { chapterNeeded: 15 },
    colors: ['#312E81', '#4C1D95', '#1E1B4B', '#6D28D9', '#818CF8', '#C4B5FD'],
  },
  {
    id: 'alpine',
    name: 'Alpine',
    tag: 'Icy blues',
    price: null,
    locked: { chapterNeeded: 18 },
    colors: ['#E0F2FE', '#BAE6FD', '#7DD3FC', '#F0F9FF', '#38BDF8', '#0284C7'],
  },
  {
    id: 'molten',
    name: 'Molten',
    tag: 'Volcanic reds',
    price: null,
    locked: { chapterNeeded: 21 },
    colors: ['#7F1D1D', '#DC2626', '#1C1917', '#EA580C', '#450A0A', '#F97316'],
  },
  {
    id: 'thunderhead',
    name: 'Thunderhead',
    tag: 'Storm slate',
    price: null,
    locked: { chapterNeeded: 24 },
    colors: ['#1E293B', '#334155', '#3B82F6', '#0F172A', '#60A5FA', '#475569'],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    tag: 'Teal & pink glow',
    price: null,
    locked: { chapterNeeded: 27 },
    colors: ['#2DD4BF', '#F472B6', '#A78BFA', '#5EEAD4', '#F0ABFC', '#818CF8'],
  },
  {
    id: 'summit',
    name: 'Summit',
    tag: 'Gold & white',
    price: null,
    locked: { chapterNeeded: 30 },
    colors: ['#FDE68A', '#F5F5F4', '#FBBF24', '#FFFFFF', '#D97706', '#FEF3C7'],
  },
  {
    id: 'tempest',
    name: 'Tempest',
    tag: 'Storm-charged blues',
    price: null,
    locked: { chapterNeeded: 33 },
    colors: ['#1E293B', '#475569', '#3B82F6', '#0F172A', '#64748B', '#93C5FD'],
  },
  {
    id: 'glacial',
    name: 'Glacial',
    tag: 'Glacier teal',
    price: null,
    locked: { chapterNeeded: 36 },
    colors: ['#CFFAFE', '#67E8F9', '#A5F3FC', '#ECFEFF', '#22D3EE', '#06B6D4'],
  },
  {
    id: 'polaris',
    name: 'Polaris',
    tag: 'Polar night sky',
    price: null,
    locked: { chapterNeeded: 39 },
    colors: ['#0B1120', '#1E3A5F', '#3B82F6', '#E0E7FF', '#818CF8', '#F8FAFC'],
  },
  {
    id: 'nightfall',
    name: 'Nightfall',
    tag: 'Dusk violet',
    price: null,
    locked: { chapterNeeded: 42 },
    colors: ['#4C1D95', '#312E81', '#7C3AED', '#1E1B4B', '#A78BFA', '#DB2777'],
  },
  {
    id: 'ember-peak',
    name: 'Ember Peak',
    tag: 'High-altitude embers',
    price: null,
    locked: { chapterNeeded: 45 },
    colors: ['#450A0A', '#7F1D1D', '#EA580C', '#1C1917', '#F97316', '#FDBA74'],
  },
  {
    id: 'skyfire',
    name: 'Skyfire',
    tag: 'Blazing summit sky',
    price: null,
    locked: { chapterNeeded: 48 },
    colors: ['#F97316', '#FB7185', '#FBBF24', '#EA580C', '#F472B6', '#FDE047'],
  },
  // Shop Expansion — 8 new purchasable/Endless-rank skins (see
  // theme_and_shop_update/README.md). Endless-rank ones use the new `endlessRank` lock
  // kind, checked against getHighestEndlessRankIndex() rather than solves/chapters.
  {
    id: 'coral-reef',
    name: 'Coral Reef',
    tag: 'Warm coral & teal',
    price: 360,
    colors: ['#FF8A65', '#4DD0E1', '#FFAB91', '#26C6DA', '#FFCCBC', '#00ACC1'],
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    tag: 'Navy technical',
    price: 420,
    colors: ['#0D1B2A', '#1B3A5C', '#3E5C76', '#F0F4F8', '#748CAB', '#1B263B'],
  },
  {
    id: 'orchid',
    name: 'Orchid',
    tag: 'Pink & violet',
    price: 450,
    colors: ['#C77DFF', '#9D4EDD', '#E0AAFF', '#7B2CBF', '#F3D9FA', '#5A189A'],
  },
  {
    id: 'copper',
    name: 'Copper',
    tag: 'Metallic bronze',
    price: 390,
    colors: ['#B87333', '#8C5A2B', '#D9A066', '#6B4226', '#EBC79E', '#A9662E'],
  },
  {
    id: 'mint-fizz',
    name: 'Mint Fizz',
    tag: 'Mint & lime',
    price: 340,
    colors: ['#B9FBC0', '#77DD77', '#D4F8E8', '#4CAF50', '#E9FFE1', '#8FD9A8'],
  },
  // Second wave of purchasable skins — grows the shop's one-time content pool
  // alongside the Boosts consumables (see storage/db.ts), so a heavy player has more
  // to spend coins on before the shop runs dry.
  {
    id: 'lagoon',
    name: 'Lagoon',
    tag: 'Turquoise & sand',
    price: 380,
    colors: ['#5EEAD4', '#0E7490', '#FDE68A', '#A5F3FC', '#0891B2', '#FEF3C7'],
  },
  {
    id: 'cinder',
    name: 'Cinder',
    tag: 'Charcoal & ember',
    price: 340,
    colors: ['#292524', '#EA580C', '#57534E', '#FDBA74', '#1C1917', '#F97316'],
  },
  {
    id: 'plum',
    name: 'Plum',
    tag: 'Deep purple & rose',
    price: 420,
    colors: ['#581C87', '#F472B6', '#86198F', '#FBCFE8', '#3B0764', '#D946EF'],
  },
  {
    id: 'seafoam',
    name: 'Seafoam',
    tag: 'Pastel green & blue',
    price: 300,
    colors: ['#D1FAE5', '#A7F3D0', '#BAE6FD', '#6EE7B7', '#7DD3FC', '#ECFDF5'],
  },
  {
    id: 'eclipse',
    name: 'Eclipse',
    // Once unlocked this is the tile's regular subtitle (see ShopPage.tsx, which only
    // shows cosmeticLockLabel while still locked) — so it describes the skin itself,
    // not the rank gate, which is why it's rank-locked *and* coin-priced.
    tag: 'Black & gold',
    price: 500,
    locked: { endlessRank: 'Gold' },
    colors: ['#0A0A0A', '#D4AF37', '#1C1C1C', '#F4E4A6', '#2E2E2E', '#B8860B'],
  },
  {
    id: 'coastal',
    name: 'Coastal',
    tag: 'Deep sea blues',
    price: 650,
    locked: { endlessRank: 'Diamond' },
    colors: ['#0B4F6C', '#01BAEF', '#E0FBFC', '#D4A373', '#146C94', '#F1EBDD'],
  },
  {
    id: 'wildfire',
    name: 'Wildfire',
    tag: 'Blazing red & orange',
    price: 800,
    locked: { endlessRank: 'Master I' },
    colors: ['#7A0C0C', '#D62828', '#F77F00', '#3A0202', '#FCBF49', '#9E2A2B'],
  },
]

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0]
}
