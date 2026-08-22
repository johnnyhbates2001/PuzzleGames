/**
 * Rasterizes public/icons/source.svg into the PNG sizes the manifest and iOS need.
 * Run via `npm run gen:icons`. The source SVG fills its full square with an opaque
 * background and keeps the crown glyph within ~60% of the canvas, so every output
 * (including the maskable variant) already respects the icon safe zone — no
 * per-target cropping/padding logic needed.
 */
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = join(__dirname, '..', 'public', 'icons')
const svg = readFileSync(join(ICONS_DIR, 'source.svg'), 'utf-8')

const TARGETS: { name: string; size: number }[] = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-512-maskable.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const target of TARGETS) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: target.size } })
  const png = resvg.render().asPng()
  writeFileSync(join(ICONS_DIR, target.name), png)
  console.log(`[gen:icons] wrote ${target.name} (${target.size}x${target.size})`)
}
