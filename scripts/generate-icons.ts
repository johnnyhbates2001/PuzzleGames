/**
 * Rasterizes public/icons/source.svg (and source-maskable.svg) into the PNG sizes
 * the manifest and iOS need. Run via `npm run gen:icons`. source.svg is full-bleed
 * (OS chrome applies its own corner mask), while source-maskable.svg shrinks the
 * grid mark to fit Android/PWA's maskable safe zone — so only icon-512-maskable.png
 * is rendered from the maskable source; every other target uses source.svg.
 */
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = join(__dirname, '..', 'public', 'icons')
const svg = readFileSync(join(ICONS_DIR, 'source.svg'), 'utf-8')
const maskableSvg = readFileSync(join(ICONS_DIR, 'source-maskable.svg'), 'utf-8')

const TARGETS: { name: string; size: number; svg: string }[] = [
  { name: 'icon-192.png', size: 192, svg },
  { name: 'icon-512.png', size: 512, svg },
  { name: 'icon-512-maskable.png', size: 512, svg: maskableSvg },
  { name: 'apple-touch-icon.png', size: 180, svg },
]

for (const target of TARGETS) {
  const resvg = new Resvg(target.svg, { fitTo: { mode: 'width', value: target.size } })
  const png = resvg.render().asPng()
  writeFileSync(join(ICONS_DIR, target.name), png)
  console.log(`[gen:icons] wrote ${target.name} (${target.size}x${target.size})`)
}
