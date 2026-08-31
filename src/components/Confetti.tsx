import { useMemo, type CSSProperties } from 'react'
import { useRegionColors } from '../hooks/useSkin'

interface Piece {
  left: number
  color: string
  delay: number
  duration: number
  rotate: number
  drift: number
}

interface ConfettiProps {
  /** Full burst on a chapter/boss clear, a light sprinkle on a routine level — see
   *  CompleteSheet's chapterComplete prop. */
  variant?: 'full' | 'light'
}

/** One-shot celebratory burst rendered once per completion screen — a fixed set of
 *  pieces frozen at mount (not re-randomized on re-render), each falling with its own
 *  timing/drift/rotation via CSS custom properties. Plays once, never loops. */
export function Confetti({ variant = 'full' }: ConfettiProps) {
  const regionColors = useRegionColors()
  const pieceCount = variant === 'full' ? 16 : 4
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: pieceCount }, (_, i) => ({
        left: Math.random() * 100,
        color: regionColors[i % regionColors.length],
        delay: Math.random() * 200,
        duration: 900 + Math.random() * 400,
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 60,
      })),
    // Frozen at mount, same as before — regionColors/pieceCount don't change within
    // one completion screen's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
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
