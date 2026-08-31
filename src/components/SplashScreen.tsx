import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useRegionColors } from '../hooks/useSkin'

// Rotates so it doesn't go stale from being seen every cold launch — see App.tsx for
// the sessionStorage gate that keeps this to once per app open.
const NOTES = [
  'Volim te, dušo',
  'Srce moje',
  'Volim te više svaki dan ❤️',
  'Zauvijek tvoj',
  'Sva sreća je u tebi',
  'Za mog knjiškog moljca',
  'Bok, zlato',
  'Hej, ljepotice',
  'Dobrodošla, ljubavi 👋',
  'Spremna za igru, dušo? 🧩',
  'Ti si moj najdraži dio dana',
  'Ljube, ova igra je za tebe',
]

// Design spec: total on-screen time is 1200ms, not the previous 1800+420.
const VISIBLE_MS = 900
const FADE_MS = 300
const GRID_COLS = 6
const GRID_SQUARES = GRID_COLS * GRID_COLS
// Entrance choreography: grid pops in reading order (row-major, matching the array
// index below), the message follows, the wordmark rises last — all comfortably inside
// VISIBLE_MS so nothing is still mid-entrance when the fade-out starts.
const GRID_STAGGER_MS = 9
const MESSAGE_DELAY_MS = 220
const WORDMARK_DELAY_MS = 420

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [note] = useState(() => NOTES[Math.floor(Math.random() * NOTES.length)])
  const [fading, setFading] = useState(false)
  const reducedMotion = useReducedMotion()
  const regionColors = useRegionColors()
  // Cycles the equipped skin's palette across the grid rather than repeating it in a
  // fixed order every launch, so the wash doesn't look identically striped each time.
  const gridColors = useMemo(() => {
    const offset = Math.floor(Math.random() * regionColors.length)
    return Array.from({ length: GRID_SQUARES }, (_, i) => regionColors[(i + offset) % regionColors.length])
  }, [regionColors])

  useEffect(() => {
    if (fading) {
      const t = setTimeout(onDone, reducedMotion ? 0 : FADE_MS)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setFading(true), VISIBLE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fading])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setFading(true)}
      className={`fixed inset-0 z-100 flex flex-col overflow-hidden bg-bg transition-opacity ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: reducedMotion ? '0ms' : `${FADE_MS}ms` }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="grid gap-2 opacity-50"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 52px)`, transform: 'rotate(-8deg) scale(1.12)' }}
        >
          {gridColors.map((c, i) => (
            <div
              key={i}
              className="anim-pop-in size-[52px] rounded-[15px]"
              style={{ backgroundColor: c, animationDelay: `${i * GRID_STAGGER_MS}ms`, animationFillMode: 'both' }}
            />
          ))}
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 75% at 50% 46%, color-mix(in oklch, var(--bg) 55%, transparent) 0%, var(--bg) 62%)',
        }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-11">
        <p
          className="anim-pop-in text-center font-display text-[30px] leading-tight font-extrabold tracking-tight text-ink"
          style={{ animationDelay: `${MESSAGE_DELAY_MS}ms`, animationFillMode: 'both' }}
        >
          {note}
        </p>
        <div
          className="anim-pop-in h-[3px] w-[34px] rounded-full bg-accent opacity-50"
          style={{ animationDelay: `${MESSAGE_DELAY_MS + 60}ms`, animationFillMode: 'both' }}
        />
      </div>
      <div className="relative flex justify-center pb-10">
        <span
          className="anim-rise text-[11px] font-bold tracking-[0.3em] text-ink-muted uppercase opacity-75"
          style={{ animationDelay: `${WORDMARK_DELAY_MS}ms`, animationFillMode: 'both' }}
        >
          Puzzles
        </span>
      </div>
    </div>
  )
}
