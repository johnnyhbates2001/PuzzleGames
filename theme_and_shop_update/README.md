# Handoff: Shop Expansion

## Overview
Expands the existing Shop screen from a single "board skins" grid into 11 unlockable categories: board skins (8 new), plus 10 brand-new cosmetic categories — per-game piece/marker skins for Queens, Zip, Sudoku, Patches, and Nonogram, plus confetti styles, celebration animations, sound packs, accent color themes, and app icon packs. Each item is either coin-purchasable or earned through play (solve count, chapter milestone, achievement, or Endless rank).

## About the Design Files
The bundled file (`Shop Expansion.dc.html`) is a **design reference**, not production code — it's a static HTML mockup of the expanded Shop screen, built to match the app's existing dark Shop theme, fonts, and per-game accent colors. The task is to **recreate this design's data model and UI in the existing React/TypeScript codebase** (Vite + React Router + Tailwind v4, per `src/`), following the same patterns already used for `SKINS` in `src/skins.ts` and `ShopPage.tsx` — not to ship the HTML file itself.

## Fidelity
**Low-to-medium fidelity for new categories.** Board-skin tiles reuse the app's real 16-swatch tile pattern exactly (hifi). The 10 new categories are conceptual — visual treatments (glyphs, line styles, digit fonts, badge shapes, textures, confetti, animations, icons) are illustrative placeholders showing intent, not final assets. Real SFX, custom marker artwork, and app icon graphics still need sourcing/design before shipping.

## New data needed (mirrors `src/skins.ts`'s `Skin` shape)

Each category needs its own typed list, its own `DEFAULT_*_ID`, an owned/equipped pair in settings storage, and its own `getX(id)` lookup — copy the exact pattern in `src/skins.ts` and `src/hooks/useSkin.tsx` per category (or generalize into one generic "cosmetic slot" system — see Recommendation below).

```ts
interface CosmeticItem {
  id: string
  name: string
  tag: string
  price: number | null
  locked?:
    | { solvesNeeded: number }
    | { chapterNeeded: number }
    | { achievementId: string }   // NEW lock kind — see below
    | { endlessRank: string }     // NEW lock kind — see below
}
```

`Skin['locked']` today only supports `solvesNeeded` / `chapterNeeded`. Two new lock kinds are needed for this expansion:
- `achievementId` — gate on a specific `AchievementDef.id` from `src/achievements/definitions.ts` being satisfied (compute via the same `AchievementContext` already built for the Awards page).
- `endlessRank` — gate on `EndlessProgress.rank` (from `src/games/chapters.ts`'s `endlessProgress()`) reaching one of the `RANKS` values.

### Category list, counts, and lock plan

| Category | New items | Buy | Earn-locked | Lock type |
|---|---|---|---|---|
| Board skins | 8 (Coral Reef, Blueprint, Orchid, Copper, Mint Fizz, Eclipse, Coastal, Wildfire) | 5 | 3 | Endless rank (Gold / Diamond / Master I) |
| Queens markers | 5 + default Crown | 3 (Star, Gem, Dot) | 2 (Chess King, Flame) | achievement (`queens-expert`, `unstoppable`) |
| Zip line styles | 5 + default Classic | 3 (Dashed, Dotted, Glow) | 2 (Braided, Pulse) | chapter (15) / achievement (`zip-expert`) |
| Sudoku digit styles | 4 + default Classic | 2 (Rounded, Mono) | 2 (Handwritten, Neon) | chapter (9) / achievement (`sudoku-expert`) |
| Patches badge shapes | 4 + default Classic | 2 (Circle, Hexagon) | 2 (Diamond, Scallop) | chapter (18) / achievement (`patches-expert`) |
| Nonogram fill textures | 4 + default Classic | 2 (Crosshatch, Dot Grid) | 2 (Gradient, Glow) | chapter (21) / achievement (`nonogram-expert`) |
| Confetti styles | 5 | 2 (Ribbons, Fireworks) | 3 (Century Burst, Puzzle Master Shower, Collector's Rain) | achievement (`century`, `puzzle-master`, `collector`) |
| Celebration animations | 4 | 2 (Bounce Pop, Shockwave) | 2 (Streak Flame, Rocket Launch) | achievement (`week-warrior`, `unstoppable`) |
| Sound packs | 4 | 2 (Retro 8-bit, Chimes) | 2 (Unstoppable Beat, Flawless Hush) | achievement (`unstoppable`, `flawless`) |
| Accent themes | 6 | 4 (Coral, Emerald, Sky, Rose) | 2 (Diamond Chrome, Master Gold) | Endless rank (Diamond / Master) |
| App icon packs | 4 | 2 (Retro Arcade, Minimal Mono) | 2 (All-Rounder, Puzzle Master) | achievement (`all-rounder`, `puzzle-master`) |

Every per-game category (Queens/Zip/Sudoku/Patches/Nonogram) also has a "Classic"/default entry that's free and pre-equipped, matching `candy`/`midnight` in `SKINS`.

## Integration points in the existing codebase

- **`src/skins.ts`** — add the 8 new `Skin` entries (colors given in the mockup, hex values below). Extend `Skin['locked']` union with `{ endlessRank: string }` for Eclipse/Coastal/Wildfire; the existing `chapterNeeded`/`solvesNeeded` shape doesn't reach Endless.
- **New files per category** (or one generalized file — see Recommendation): `src/queensMarkers.ts`, `src/zipLineStyles.ts`, `src/sudokuDigitStyles.ts`, `src/patchesBadgeShapes.ts`, `src/nonogramTextures.ts`, `src/confettiStyles.ts`, `src/celebrationAnimations.ts`, `src/soundPacks.ts`, `src/accentThemes.ts`, `src/iconPacks.ts` — each exporting a typed list + `DEFAULT_*_ID` + `get*(id)`, following `skins.ts`.
- **`src/hooks/useSkin.tsx`** — either duplicate this hook per category, or (recommended) generalize into a single `useCosmetic(categoryKey)` hook backed by one `ownedByCategory: Record<string, string[]>` / `equippedByCategory: Record<string,string>` shape in settings, so 11 categories don't mean 11 near-identical context providers.
- **`src/storage/db.ts`** — extend `Settings` with owned/equipped fields per category (or the generalized map above), plus `buySkin`/`equipSkin`-equivalent functions per category (or one generic `buyCosmetic(category, id, price)` / `equipCosmetic(category, id)`).
- **`src/pages/ShopPage.tsx`** — restructure into a scrollable multi-section page (sticky category nav, one grid per category), reusing the existing tile markup for skins and adding new tile renderers per category type (see Visual treatments below). This file currently only renders one grid — it needs the section/nav structure shown in the mockup.
- **`src/achievements/definitions.ts`** — no changes needed to the achievement list itself; the new `achievementId` lock type just reads existing `AchievementDef` checks via `AchievementContext`.
- **`src/games/chapters.ts`** — no changes needed; `endlessProgress()` and its `RANKS` array already provide what `endlessRank` locks need.
- **Consumption points** — each category needs its equipped value threaded into the component that actually renders it:
  - Queens marker glyph → wherever Board.tsx currently renders the crown (search for the crown glyph/icon in `Board.tsx`).
  - Zip line style → Zip's path-rendering component.
  - Sudoku digit style → the digit-rendering cell component (font-family/weight swap).
  - Patches badge shape → the badge component (border-radius/clip-path swap).
  - Nonogram texture → filled-cell rendering (background-image swap).
  - Confetti style → `Confetti.tsx`.
  - Celebration animation → each Game*CompletePage's win-effect trigger (currently the fixed `.anim-solve-sweep` / confetti flow).
  - Sound pack → `audio/sfx.ts`.
  - Accent theme → needs a new CSS custom-property layer alongside the existing per-game `[data-game]` accent overrides in `index.css`, selectable independent of them.
  - App icon pack → `icons/` + `scripts/generate-icons.ts` — this one needs a manifest/re-install step, more involved than the others (flag this to the user before scoping).

## Design tokens (already in `src/index.css` — reuse, don't reinvent)
- Shop dark theme: `--bg: oklch(18% 0.012 260)`, `--surface: oklch(24% 0.014 260)`, `--ink: oklch(96% 0.01 260)`, `--ink-muted: oklch(72% 0.02 260)`.
- Default accent (violet): `oklch(66% 0.17 300)` / tint `oklch(30% 0.05 300)`.
- Per-game accents (dark mode): Sudoku `oklch(64% 0.15 250)`, Zip `oklch(62% 0.11 175)`, Patches `oklch(66% 0.14 45)`, Nonogram `oklch(68% 0.16 340)`.
- Coin-price pill: bg `oklch(80% 0.14 85)`, text `oklch(25% 0.06 75)`.
- Font: Poppins 600/700/800 (`--font-display`), already self-hosted via `/fonts/poppins-*.woff2` — the mockup uses a Google Fonts link only as a stand-in.
- Tile shape: `border-radius: 18px` card, `border-radius: 9px` inner preview, `grid-template-columns: repeat(3, 1fr)`, `gap: 10px` — exactly matches the existing skin grid in `ShopPage.tsx`.

## New board-skin colors (add to `SKINS` in `src/skins.ts`)
```
Coral Reef  (280 coins): #FF8A65 #4DD0E1 #FFAB91 #26C6DA #FFCCBC #00ACC1
Blueprint   (320 coins): #0D1B2A #1B3A5C #3E5C76 #F0F4F8 #748CAB #1B263B
Orchid      (350 coins): #C77DFF #9D4EDD #E0AAFF #7B2CBF #F3D9FA #5A189A
Copper      (300 coins): #B87333 #8C5A2B #D9A066 #6B4226 #EBC79E #A9662E
Mint Fizz   (260 coins): #B9FBC0 #77DD77 #D4F8E8 #4CAF50 #E9FFE1 #8FD9A8
Eclipse     (locked · Endless Gold):    #0A0A0A #D4AF37 #1C1C1C #F4E4A6 #2E2E2E #B8860B
Coastal     (locked · Endless Diamond): #0B4F6C #01BAEF #E0FBFC #D4A373 #146C94 #F1EBDD
Wildfire    (locked · Endless Master I):#7A0C0C #D62828 #F77F00 #3A0202 #FCBF49 #9E2A2B
```

## Visual treatments for new categories (CSS-only, no new image assets required to ship v1)
- **Queens markers**: swap the emoji/glyph rendered in the marked cell (Crown 👑 default, Star ⭐, Gem 💎, Dot — plain circle, Chess King ♚, Flame 🔥).
- **Zip line styles**: swap the path segment's `background`/`border` — solid bar, `repeating-linear-gradient` dashed/dotted, `box-shadow` glow, diagonal-stripe "braided", pulsing opacity keyframe.
- **Sudoku digit styles**: swap `font-family`/`font-weight`/`font-style` on placed digits (system sans, rounded, monospace, cursive/handwritten, neon `text-shadow`).
- **Patches badge shapes**: swap `border-radius`/`clip-path` on the badge (rounded square, circle, hexagon polygon, rotated square diamond, scalloped polygon).
- **Nonogram textures**: swap `background`/`background-image` on filled cells (solid, crosshatch double `repeating-linear-gradient`, dot-grid `radial-gradient`, two-color `linear-gradient`, glow `box-shadow`).
- **Confetti/celebration/sound/icon packs**: need real asset or SFX decisions before ship — mockup uses emoji and CSS keyframes as placeholders only.

## Recommendation
Before implementation, decide: **one generalized "cosmetic slot" system** (one `CosmeticItem[]` registry keyed by category, one owned/equipped map, one Shop section renderer parameterized by category) vs. **11 separate copy-pasted systems** mirroring `skins.ts`/`useSkin.tsx` exactly. The generalized version is more work up front but avoids 10x'ing the maintenance burden `skins.ts` already has at 25 entries growing into 11 categories × several entries each.

## Files
- `Shop Expansion.dc.html` — the mockup covering every category, tile layout, lock states, and buy pills described above.
