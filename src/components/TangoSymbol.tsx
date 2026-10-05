import type { CSSProperties, ReactNode } from 'react'
import { MOON, SUN, type TangoValue } from '../engine/tango/types'
import { useEquippedCosmetic } from '../hooks/useCosmetics'
import { MoonIcon, SunIcon } from './icons'

/** Theme-invariant symbol colors — like Wordle's green/yellow, warm sun vs. cool moon is
 *  the game's own identity rather than something an accent theme should recolor. */
export const SUN_COLOR = 'oklch(74% 0.16 65)'
export const MOON_COLOR = 'oklch(58% 0.13 255)'

interface Glyph {
  color: string
  icon: ReactNode
  style?: CSSProperties
}

const svg = (children: ReactNode, filled = true) => (
  <svg
    viewBox="0 0 24 24"
    className="size-full"
    fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? undefined : 'currentColor'}
    strokeWidth={filled ? undefined : 3}
    strokeLinecap="round"
  >
    {children}
  </svg>
)

const GLOW: CSSProperties = { filter: 'drop-shadow(0 0 3px currentColor) drop-shadow(0 0 1px currentColor)' }

/** Tango 'symbol sets' cosmetic (see cosmetics.ts) — each set swaps the [sun, moon]
 *  pair for another two-symbol pair. Only the look changes: the first glyph always
 *  stands in for SUN and the second for MOON, so the rules and the board logic don't
 *  care which set is equipped. */
const SYMBOL_SETS: Record<string, [Glyph, Glyph]> = {
  classic: [
    { color: SUN_COLOR, icon: <SunIcon className="size-full" /> },
    { color: MOON_COLOR, icon: <MoonIcon className="size-full" /> },
  ],
  'fire-ice': [
    {
      color: 'oklch(64% 0.2 35)',
      icon: svg(<path d="M12 2.5c.6 3.3 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.7 1.5-4.4 2.8-5.6.2 1.9 1 3 2.2 3.4C10.6 8.6 11 5.1 12 2.5z" />),
    },
    {
      color: 'oklch(68% 0.12 225)',
      icon: svg(<path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.5 4l2.5 2.5L14.5 4M9.5 20l2.5-2.5 2.5 2.5" />, false),
    },
  ],
  'dots-rings': [
    { color: 'var(--color-ink)', icon: svg(<circle cx="12" cy="12" r="8" />) },
    { color: 'var(--color-ink)', icon: svg(<circle cx="12" cy="12" r="7" />, false) },
  ],
  'x-o': [
    { color: 'oklch(60% 0.2 25)', icon: svg(<path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />, false) },
    { color: 'oklch(58% 0.14 250)', icon: svg(<circle cx="12" cy="12" r="7" />, false) },
  ],
  'go-stones': [
    {
      color: 'oklch(22% 0.01 260)',
      icon: svg(
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="9" cy="9" r="2.5" fill="white" opacity="0.25" />
        </>,
      ),
    },
    {
      color: 'oklch(97% 0.005 90)',
      icon: svg(<circle cx="12" cy="12" r="9" stroke="oklch(55% 0.01 260)" strokeWidth="1.2" />),
    },
  ],
  neon: [
    { color: 'oklch(80% 0.17 70)', icon: <SunIcon className="size-full" />, style: GLOW },
    { color: 'oklch(72% 0.15 230)', icon: <MoonIcon className="size-full" />, style: GLOW },
  ],
}

/** `set` overrides the equipped set — the Shop's preview tiles use it to show a set the
 *  player doesn't own yet. */
export function TangoSymbol({ value, className, set }: { value: TangoValue; className?: string; set?: string }) {
  const equipped = useEquippedCosmetic('tangoSymbolSet')
  if (value !== SUN && value !== MOON) return null
  const pair = SYMBOL_SETS[set ?? equipped] ?? SYMBOL_SETS.classic
  const glyph = pair[value === SUN ? 0 : 1]
  return (
    <span className={`flex ${className ?? ''}`} style={{ color: glyph.color, ...glyph.style }}>
      {glyph.icon}
    </span>
  )
}
