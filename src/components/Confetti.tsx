import { useMemo, type CSSProperties } from 'react'
import { REGION_COLORS } from './Cell'

const PIECE_COUNT = 24

interface Piece {
  left: number
  color: string
  delay: number
  duration: number
  rotate: number
  drift: number
}

/** One-shot celebratory burst rendered once per completion screen — a fixed set of
 *  pieces frozen at mount (not re-randomized on re-render), each falling with its own
 *  timing/drift/rotation via CSS custom properties. Plays once, never loops. */
export function Confetti() {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        left: Math.random() * 100,
        color: REGION_COLORS[i % REGION_COLORS.length],
        delay: Math.random() * 200,
        duration: 900 + Math.random() * 400,
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 60,
      })),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="anim-confetti absolute top-0 size-2 rounded-[1px]"
          style={
            {
              left: `${p.left}%`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
              '--drift': `${p.drift}px`,
              '--rotate': `${p.rotate}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
