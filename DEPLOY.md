# Deploying Queens

This is a plain static site — `npm run build` produces a `dist/` folder with no
server-side requirements. Either host below works from a git-connected dashboard
deploy; no project-specific configuration is needed beyond what's below.

## Before deploying

```bash
npm install
npm run gen:banks   # only needed if src/data/banks/*.json isn't already committed
npm run gen:icons   # only needed if public/icons/*.png isn't already committed
npm test
npm run build
npm run preview     # smoke-test the production build locally
```

The level banks and generated icons are meant to be committed to the repo — `gen:banks`
and `gen:icons` are setup/regeneration steps, not part of the build itself.

## Cloudflare Pages

1. Push this repo to GitHub/GitLab and connect it in the Cloudflare Pages dashboard
   (Workers & Pages → Create → Pages → Connect to Git).
2. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Deploy. Every push to the connected branch redeploys automatically.

Or from the CLI (no dependency added — run on demand via `npx`):

```bash
npx wrangler pages deploy dist
```

## Vercel

1. Import the repo at vercel.com/new. Vercel auto-detects the Vite preset.
2. Build settings (should be auto-filled):
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Deploy. Every push redeploys automatically.

Or from the CLI:

```bash
npx vercel deploy --prod
```

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
