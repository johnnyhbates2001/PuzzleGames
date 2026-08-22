/**
 * Generates iOS "Add to Home Screen" launch splash images. Unlike generate-icons.ts,
 * these are non-square, so the source icon can't just be rasterized at a target width
 * (fitTo:{mode:'width'} scales proportionally, it can't independently set width/height
 * or letterbox a square source into a rectangle). Instead each target gets its own
 * wrapper SVG — a solid rect at the exact device pixel size, with source.svg embedded
 * as a smaller centered <image>. The wrapper's background is the manifest's
 * background_color (vite.config.ts), matching the app's actual light background so
 * there's no color flash between the splash screen and the app finishing its load.
 *
 * Sizes are exact device-pixel dimensions (CSS pt x -webkit-device-pixel-ratio) for the
 * portrait media queries iOS Safari matches an apple-touch-startup-image against — it
 * requires an EXACT match, no scaling fallback, so these cover the distinct screen
 * sizes across current-generation iPhones (some models share a bucket).
 *
 * Run via `npm run gen:splash`.
 */
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = join(__dirname, '..', 'public', 'icons')
const sourceSvg = readFileSync(join(ICONS_DIR, 'source.svg'), 'utf-8')
const sourceSvgBase64 = Buffer.from(sourceSvg, 'utf-8').toString('base64')

const BACKGROUND = '#F7F7F8' // matches vite.config.ts manifest background_color

export interface SplashTarget {
  name: string
  /** Device pixel width/height (CSS pt * device pixel ratio) — portrait orientation. */
  width: number
  height: number
  /** CSS pt width/height and device pixel ratio, for the apple-touch-startup-image
   *  media query in index.html. */
  cssWidth: number
  cssHeight: number
  dpr: number
}

// Distinct portrait pixel sizes across current-generation iPhones (several models
// share a bucket since Apple reuses screen sizes across generations).
export const SPLASH_TARGETS: SplashTarget[] = [
  { name: 'splash-750x1334.png', width: 750, height: 1334, cssWidth: 375, cssHeight: 667, dpr: 2 }, // SE
  { name: 'splash-1125x2436.png', width: 1125, height: 2436, cssWidth: 375, cssHeight: 812, dpr: 3 }, // mini
  { name: 'splash-1170x2532.png', width: 1170, height: 2532, cssWidth: 390, cssHeight: 844, dpr: 3 }, // 12/13/14 standard
  { name: 'splash-1179x2556.png', width: 1179, height: 2556, cssWidth: 393, cssHeight: 852, dpr: 3 }, // 14 Pro/15/15 Pro/16
  { name: 'splash-1284x2778.png', width: 1284, height: 2778, cssWidth: 428, cssHeight: 926, dpr: 3 }, // 12/13 Pro Max, 14 Plus
  { name: 'splash-1290x2796.png', width: 1290, height: 2796, cssWidth: 430, cssHeight: 932, dpr: 3 }, // 14 Pro Max/15 Plus/15 Pro Max/16 Plus
  { name: 'splash-1320x2868.png', width: 1320, height: 2868, cssWidth: 440, cssHeight: 956, dpr: 3 }, // 16 Pro Max
]

function buildWrapperSvg(width: number, height: number): string {
  const iconSize = Math.round(Math.min(width, height) * 0.35)
  const x = Math.round((width - iconSize) / 2)
  const y = Math.round((height - iconSize) / 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${BACKGROUND}"/>
    <image href="data:image/svg+xml;base64,${sourceSvgBase64}" x="${x}" y="${y}" width="${iconSize}" height="${iconSize}"/>
  </svg>`
}

for (const target of SPLASH_TARGETS) {
  const wrapperSvg = buildWrapperSvg(target.width, target.height)
  const resvg = new Resvg(wrapperSvg, { fitTo: { mode: 'width', value: target.width } })
  const png = resvg.render().asPng()
  writeFileSync(join(ICONS_DIR, target.name), png)
  console.log(`[gen:splash] wrote ${target.name} (${target.width}x${target.height})`)
}
