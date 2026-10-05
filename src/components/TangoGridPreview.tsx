import { EMPTY, MOON, SUN } from '../engine/tango/types'
import { TangoSymbol } from './TangoSymbol'

// Purely decorative — a 3x3 sun/moon pattern evoking the mechanic without needing real
// puzzle data.
const SAMPLE = [SUN, MOON, EMPTY, MOON, SUN, SUN, EMPTY, MOON, SUN] as const

export function TangoGridPreview() {
  return (
    <div className="grid size-full grid-cols-3 gap-0.5">
      {SAMPLE.map((v, i) => (
        <div key={i} className="flex aspect-square items-center justify-center rounded-[3px] border border-border-dashed bg-surface">
          <TangoSymbol value={v} className="size-[70%]" />
        </div>
      ))}
    </div>
  )
}
