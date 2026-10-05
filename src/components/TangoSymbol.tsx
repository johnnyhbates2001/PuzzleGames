import { MOON, SUN, type TangoValue } from '../engine/tango/types'
import { MoonIcon, SunIcon } from './icons'

/** Theme-invariant symbol colors — like Wordle's green/yellow, warm sun vs. cool moon is
 *  the game's own identity rather than something an accent theme should recolor. */
export const SUN_COLOR = 'oklch(74% 0.16 65)'
export const MOON_COLOR = 'oklch(58% 0.13 255)'

export function TangoSymbol({ value, className }: { value: TangoValue; className?: string }) {
  if (value === SUN) {
    return (
      <span className={`flex ${className ?? ''}`} style={{ color: SUN_COLOR }}>
        <SunIcon className="size-full" />
      </span>
    )
  }
  if (value === MOON) {
    return (
      <span className={`flex ${className ?? ''}`} style={{ color: MOON_COLOR }}>
        <MoonIcon className="size-full" />
      </span>
    )
  }
  return null
}
