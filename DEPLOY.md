# Deploying Queens

This is a Cloudflare Worker: `npm run build` produces the static `dist/` frontend, and
`worker/index.ts` serves the `/api/*` accounts/friends/leaderboard/backup routes
alongside it, backed by D1 (accounts, friendships, scores). It can no longer be
deployed as a plain static site (Cloudflare Pages, Vercel, etc.) — without the Worker
and D1 behind it, sign-in, friends, leaderboards, and backup/restore would silently
not work.

## One-time Cloudflare setup

Only needed once per Cloudflare account (skip if `wrangler.jsonc`'s `database_id` is
already a real id, not the `REPLACE_WITH_REAL_D1_DATABASE_ID` placeholder):

```bash
npx wrangler login
npx wrangler d1 create puzzlegames-db      # copy the printed database_id into wrangler.jsonc
npx wrangler d1 migrations apply puzzlegames-db --remote   # applies worker/migrations/*.sql
```

## Before deploying

```bash
npm install
npm run gen:banks   # only needed if src/data/banks/*.json isn't already committed
npm run gen:icons   # only needed if public/icons/*.png isn't already committed
npm test
npm run build
npm run preview     # smoke-test the static frontend locally (no /api/* — use wrangler dev for that)
npx wrangler dev     # smoke-test the full app, frontend + /api/* + local D1, before deploying
```

The level banks and generated icons are meant to be committed to the repo — `gen:banks`
and `gen:icons` are setup/regeneration steps, not part of the build itself.

## Deploy

```bash
npm run build
npx wrangler deploy
```

Every new migration added under `worker/migrations/` after the first deploy needs its
own `npx wrangler d1 migrations apply puzzlegames-db --remote` before (or as part of)
that deploy — `wrangler deploy` does not run migrations for you.

## Verifying the deploy

- Open the deployed URL, confirm the service worker registers (DevTools →
  Application → Service Workers) and the Cache Storage entry lists the app
  shell, icons, and the three level-bank JS chunks.
- Toggle DevTools' Network to "Offline" and reload — the app should still load
  and a level should still be playable.
- On iPhone Safari: open the URL, tap Share → Add to Home Screen, then launch
  from the Home Screen icon and confirm it opens in standalone mode (no Safari
  chrome) and works with the network off.

## Updates

Because `registerType: 'prompt'` is used, a redeploy does **not** force open
tabs to reload mid-puzzle. Returning users see a "New version available —
Refresh" toast (checked hourly and whenever the app returns to the foreground)
and reload on their own terms.
