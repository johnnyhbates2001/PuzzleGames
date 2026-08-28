export interface Skin {
  id: string
  name: string
  tag: string
  /** Palette indexed by region id, cycled via `% colors.length` wherever it's consumed
   *  (Board.tsx, PatchesBoard.tsx, GridPreview.tsx) — doesn't need to be region-count-sized. */
  colors: string[]
  /** Coin price to buy. null = free (still needs equipping, not auto-owned). */
  price: number | null
  /** Gated behind either a total solve-count or a story-chapter milestone (reached in
   *  any game — see games/chapters.ts) instead of coins. */
  locked?: { solvesNeeded: number } | { chapterNeeded: number }
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
    price: 300,
    colors: ['#FDBA74', '#FB7185', '#F9A8D4', '#FCD34D', '#F87171', '#FDE68A'],
  },
  {
    id: 'mono-ink',
    name: 'Mono Ink',
    tag: 'Greyscale',
    price: 250,
    colors: ['#E4E4E7', '#A1A1AA', '#71717A', '#D4D4D8', '#52525B', '#F4F4F5'],
  },
  {
    id: 'forest',
    name: 'Forest',
    tag: 'Mossy greens',
    price: 400,
    colors: ['#86EFAC', '#4ADE80', '#A7F3D0', '#34D399', '#BBF7D0', '#6EE7B7'],
  },
  {
    id: 'vino',
    name: 'Vino',
    tag: 'Croatian wine country',
    price: 350,
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
]

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0]
}
