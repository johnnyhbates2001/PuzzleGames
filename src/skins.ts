export interface Skin {
  id: string
  name: string
  tag: string
  /** Palette indexed by region id, cycled via `% colors.length` wherever it's consumed
   *  (Board.tsx, PatchesBoard.tsx, GridPreview.tsx) — doesn't need to be region-count-sized. */
  colors: string[]
  /** Coin price to buy. null = free (still needs equipping, not auto-owned). */
  price: number | null
  /** Present only for skins gated behind a solve-count instead of coins. */
  locked?: { solvesNeeded: number }
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
    id: 'neon',
    name: 'Neon',
    tag: 'Locked · 30 solves',
    price: null,
    locked: { solvesNeeded: 30 },
    colors: ['#2E1065', '#7C3AED', '#DB2777', '#0EA5E9', '#4C1D95', '#F472B6'],
  },
]

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0]
}
