# Handoff: Puzzles Redesign (v3) + Motion System

## Overview
A full visual redesign of the iPhone puzzle-game PWA (repo: `johnnyhbates2001/PuzzleGames`, branch `main`) — 21 screens across splash, home, chapters, all five game boards, completion/fail/hint/rules/settings, shop, stats, and awards — plus a complete motion system covering page transitions, gameplay feedback, and completion celebrations.

## About the Design Files
The `.dc.html` files in this bundle are **design references**, built as interactive HTML prototypes to communicate layout, color, typography, spacing, and motion. They are not production code. The task is to **recreate these designs inside the existing React codebase** (Vite + React Router + Tailwind v4, per `src/index.css`), using its existing components, hooks, and CSS variable system — not to port any HTML/CSS verbatim.

## Fidelity
**High-fidelity.** Colors, spacing, typography, and animation timings in the mockups are final. Treat exact values (hex/oklch, px, ms) as the spec.

## Files in this bundle
- `Puzzles Redesign v3.dc.html` — all 21 static screens (splash, home ×3 states, chapter path, 5 game boards, completion/fail/hint/rules/settings/pause, shop, stats, awards).
- `Zip + Patches revisions.dc.html` — the two screens revised after user feedback: Zip's continuous connected path, Patches' shape-carrying clue badges. These supersede the Zip/Patches boards in v3.
- `Puzzles Motion System.dc.html` — every animation in the app: page transitions, per-game gameplay feedback, rewards, completion. Each tile in this file loops continuously so a developer can watch timing/easing directly; a speed slider and pause toggle are available in the file's Tweaks panel.
- `github.md` — maps design screens to the real repo files they should land in.

Open any `.dc.html` file directly in a browser to view it (they are self-contained).

## Design tokens
All values are CSS custom properties already defined in `src/index.css` — the redesign uses these tokens exclusively, no new ones invented:
- `--bg`, `--surface`, `--ink`, `--ink-muted`, `--accent`, `--accent-tint`, `--danger`, `--border-dashed`, `--grid-gap`, `--grid-line-strong` (light/dark/yellow theme variants already exist).
- Per-game accent overrides via `[data-game='sudoku'|'zip'|'patches'|'nonogram']` (Queens and Home use the default `--accent`).
- Font: Poppins (600/700/800) for display, Roboto Mono for numeric/timer/score display.
- Shadow: `--shadow-card` = `0 1px 2px rgb(0 0 0/0.04), 0 8px 24px rgb(0 0 0/0.06)`.
- Touch targets: 44×44px minimum on every interactive control.

## Screens
See `Puzzles Redesign v3.dc.html` for full detail on each; in short:
- **Splash** — 3×3 grid tinted from the equipped skin's palette, faint background wash in the same hue. No hardcoded skin.
- **Home** — three states: first-run (empty, single CTA), mid-play (continue card + chapter rail), post-game (adds Endless promoted to the top once unlocked, no separate mode-picker).
- **Chapter path** — replaces the flat 30-row list with a winding path UI; boss levels show a one-tap "Ready?" confirmation before entry.
- **Game boards** (Queens, Sudoku, Zip, Patches, Nonogram) — unified `ControlBar` grammar: secondary actions (undo/erase) on the left, mode toggle center, hint on the right, all icon-first with labels only where ambiguous. Level context shown as "Chapter 3 · Garden Path · 7/20". Sudoku notes live in the keypad; clear requires a hold to avoid mis-taps.
- **Zip** (revised) — one continuous 21px stroke with round joins over a gapless lattice; visited cells tinted; see `Zip + Patches revisions.dc.html`.
- **Patches** (revised) — clue badges are shaped (square/wide/tall) to match the area they describe, not a generic circle; see the same file.
- **Nonogram completion** — full-bleed reveal of the finished picture instead of a generic completion card.
- **Sheets** — completion, fail, hint, rules, settings, pause: bottom sheets over a scrim, consistent entry/exit motion (see Motion System §2).
- **Shop / Stats / Awards** — refactored to fit under the tab bar; dark-forced theme regardless of light/dark setting (existing `[data-force-theme='dark']` token group).
- **Icon set** — new SVG icons replace all emoji throughout, stroke-based, matching the accent system.

## Animations
Full detail, durations, easings and reasoning are in `Puzzles Motion System.dc.html` §01–06. Summary:
- **Timing tokens**: 4 easing curves (`out-quint` for travel, `spring` for placement/overshoot, `out-quad` for feedback ripples, `in-out` for reversals/undo) and 5 durations (120/160/260/320/620ms) — nothing outside this set.
- **Page transitions**: forward push (new screen slides in from right, old parallaxes -28% and dims to 82% brightness), back reveal (exact reverse), peer cross-fade (tab bar, 180ms), sheet-up (320ms in / 240ms out, scrim fades with it), splash-in (grid pops in reading order, wordmark rises last, ~900ms total, skippable on tap).
- **Gameplay**: per-game placement/error/progress animations — see §03 for all ten (Queens crown drop + auto-X ripple, shared conflict shake + tint, Sudoku digit pop + peer ripple + new unit-complete cascade, Zip continuous path draw + checkpoint pulse, shared undo-as-reverse-placement, Patches draw-and-commit, Nonogram clue strike-through).
- **Feedback/rewards**: hint target pulse (coin-gold, 3×260ms), coin flight (620ms, 60ms stagger, balance counts up), streak advance (pip fill), toast (spring rise).
- **Completion**: solve sweep (620ms diagonal wave before the sheet appears), complete sheet (staggered rise: sheet → title → time → reward → buttons), confetti (1s, gated by level significance — full burst on chapter/boss clears, reduced on routine levels, none in late Endless), award unlock (grayscale→color with 1.32× overshoot + shine sweep), Nonogram picture reveal (center-out bloom, replaces the solve sweep for this one game).
- **Reduced motion**: transitions become a 120ms opacity fade; placements appear at full scale with no overshoot; staggers collapse to one step; confetti becomes a single static fade; solve sweep becomes a whole-board tint pulse.
- **Haptics**: light impact on placement/checkpoint, one sharp impact on conflict, three-beat pattern on solve, none on undo/navigation — tied to animation start, gated by the existing sound/vibration setting.
- **Kept as-is** (already correct in the shipped code, do not rebuild): forward/back page push, Queens auto-X ripple, solve sweep, coin flight arc, award unlock + shine.
- **Explicitly removed**: Zip's old per-cell stub pop (replaced by continuous draw), the shop's skin-flip on equip (replaced by a 200ms cross-fade + equipped-ring animation), the generic per-cell pop on fast Nonogram drags.

## Where this lands in the repo
See `github.md`'s Screen Map table for the file-by-file mapping (e.g. Zip → `src/components/ZipBoard.tsx`/`ZipCell.tsx`, motion → `src/index.css` motion block + `useAppNavigate.ts` + `TabBar.tsx` + `Board.tsx` + `Confetti.tsx` + `CompleteSheet.tsx`). Everything not yet designed (chapters pages, daily challenge, endless card, fail sheet, settings button, Nonogram components, per-game chapter names, pause state) is flagged there too — this handoff does not cover those; they still need design.

## Assets
No external assets — all icons are hand-drawn inline SVG (stroke-based, 2–2.4px stroke width) shown directly in the mockup files; copy their `<path>` data rather than recreating from scratch.
