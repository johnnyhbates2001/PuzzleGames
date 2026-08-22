# Queens

An installable, offline-first PWA of logic puzzle games, starting with **Queens** —
the colored-region variant popularized by LinkedIn. No backend, no native app store.

## Development

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm test` — run the engine/reducer unit tests (Vitest)
- `npm run build` — typecheck and produce a production build in `dist/`
- `npm run preview` — serve the production build locally
- `npm run gen:banks` — regenerate `src/data/banks/*.json`, the pre-verified,
  unique-solution level banks (only needed if you change the generator)
- `npm run gen:icons` — regenerate `public/icons/*.png` from `public/icons/source.svg`

## Architecture

- `src/engine/` — pure, framework-agnostic puzzle logic (types, solver, validator,
  generator) with no React imports. See the comments in `generator.ts` for the
  region-generation algorithm.
- `src/state/gameReducer.ts` — the board interaction state machine (3-state click
  cycle, auto-X source tracking, undo, win detection).
- `src/storage/db.ts` — IndexedDB persistence (settings, per-difficulty progress,
  in-progress level resume) via `idb`.
- `src/games/registry.ts` — the game list the homepage renders from; Queens is the
  first entry.

See `DEPLOY.md` for deployment instructions.
