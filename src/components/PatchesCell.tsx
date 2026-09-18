import { memo, type CSSProperties } from 'react'
import type { PatchShape } from '../engine/patches/types'
import { useLingeringFlag } from '../hooks/useLingeringFlag'
import { useEquippedCosmetic } from '../hooks/useCosmetics'

const CONFLICT_TINT_HOLD_MS = 900

interface PatchesCellProps {
  row: number
  col: number
  clueArea: number | null
  clueShape: PatchShape | null
  fillColor: string | null
  /** Ms to delay the fill-in animation by — set only for the most-recently-placed
   *  rect's cells, proportional to distance from the drag anchor (see PatchesBoard.tsx). */
  fillDelayMs?: number
  /** Set only while this cell falls inside an in-progress drag's live preview
   *  rectangle — the clue's own color while the placement is valid, or a danger tint
   *  once it would overlap something. Renders as a translucent overlay so an
   *  already-filled cell underneath (an invalid overlap) still shows through. */
  previewColor?: string | null
  mismatched: boolean
  borderRight: boolean
  borderBottom: boolean
  /** Ms to delay the solve-sweep's entrance by — set only once the board is solved,
   *  proportional to (row + col) so the wave travels diagonally (see PatchesBoard.tsx). */
  sweepDelayMs?: number
  /** The fill color an Undo just removed from this cell, if any — the real state is
   *  already uncovered by then, so this fades a ghost of it instead of nothing.
   *  Cleared via onRetractEnd once the animation finishes. */
  retractGhostColor?: string | null
  onRetractEnd?: () => void
  /** True for one render right after a reveal-hint filled this cell — pulses the real
   *  (now-placed) fill gold. Cleared via onHintPulseEnd. */
  hinted?: boolean
  onHintPulseEnd?: () => void
}

// Each shape fixes its own short side at the same 62%-of-cell baseline and lets the
// aspect-ratio class grow the long side from there (capped at 80% so it never crowds
// the cell's border) — square fixes both sides equally, wide fixes height and grows
// width, tall fixes width and grows height. Fixing height for all three would make
// 'tall' shrink its width below the other two's instead of growing past them, reading
// as a stray sliver rather than a shape in the same family (see the shape legend below
// the board, which has the same fix for the same reason).
const SHAPE_BADGE_CLASS: Record<PatchShape, string> = {
  square: 'h-[62%] aspect-square',
  tall: 'w-[62%] max-h-[80%] aspect-[2/3]',
  wide: 'h-[62%] max-w-[80%] aspect-[3/2]',
}

const SCALLOP_CLIP_PATH =
  'polygon(50% 0%,61% 15%,78% 8%,80% 27%,97% 33%,88% 50%,97% 67%,80% 73%,78% 92%,61% 85%,50% 100%,39% 85%,22% 92%,20% 73%,3% 67%,12% 50%,3% 33%,20% 27%,22% 8%,39% 15%)'
const HEXAGON_CLIP_PATH = 'polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0% 50%)'

/** Patches 'badge shapes' cosmetic (see cosmetics.ts) — a border-radius/clip-path swap
 *  on the clue badge, layered on top of the existing rounded-md default rather than
 *  replacing the class entirely. */
function badgeShapeCss(shape: string): CSSProperties {
  switch (shape) {
    case 'circle':
      return { borderRadius: '50%' }
    case 'hexagon':
      return { clipPath: HEXAGON_CLIP_PATH, borderRadius: 0 }
    case 'diamond':
      return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', borderRadius: 0 }
    case 'scallop':
      return { clipPath: SCALLOP_CLIP_PATH, borderRadius: 0 }
    default:
      return {}
  }
}

function PatchesCellImpl({
  row,
  col,
  clueArea,
  clueShape,
  fillColor,
  fillDelayMs,
  previewColor,
  mismatched,
  borderRight,
  borderBottom,
  sweepDelayMs,
  retractGhostColor,
  onRetractEnd,
  hinted,
  onHintPulseEnd,
}: PatchesCellProps) {
  const tinted = useLingeringFlag(mismatched, CONFLICT_TINT_HOLD_MS)
  const badgeShape = useEquippedCosmetic('patchesBadgeShape')

  function handleAnimationEnd(e: React.AnimationEvent<HTMLButtonElement>) {
    if (e.animationName === 'hint-pulse') onHintPulseEnd?.()
  }

  return (
    <button
      type="button"
      data-row={row}
      data-col={col}
      aria-label={clueArea !== null ? `Clue ${clueArea}` : `Row ${row + 1}, column ${col + 1}`}
      // Shake lives on the button itself (transform: translateX) so the whole cell
      // shakes; the fill's entrance animation (transform: scale + opacity) lives on
      // its own child span below — two `animation` shorthands on the same element
      // would fight in the cascade instead of playing together. The solve-sweep
      // (also a transform on the button) only ever runs once the board is fully
      // solved, well after any mismatch shake, so the two never overlap in practice.
      className={`relative flex aspect-square touch-none items-center justify-center bg-surface select-none ${
        mismatched ? 'anim-shake' : ''
      } ${borderRight ? 'border-r-2 border-r-grid-line-strong' : 'border-r border-r-grid-gap'} ${
        borderBottom ? 'border-b-2 border-b-grid-line-strong' : 'border-b border-b-grid-gap'
      } ${sweepDelayMs !== undefined ? 'anim-solve-sweep' : ''} ${hinted ? 'anim-hint-pulse' : ''}`}
      style={{ animationDelay: sweepDelayMs !== undefined ? `${sweepDelayMs}ms` : undefined }}
      onAnimationEnd={hinted ? handleAnimationEnd : undefined}
    >
      {retractGhostColor && (
        <span
          className="anim-retract pointer-events-none absolute inset-0"
          style={{ backgroundColor: retractGhostColor }}
          onAnimationEnd={onRetractEnd}
        />
      )}
      {fillColor && (
        <span
          className="anim-patch-fill pointer-events-none absolute inset-0"
          style={{ backgroundColor: fillColor, animationDelay: fillDelayMs ? `${fillDelayMs}ms` : undefined }}
        />
      )}
      {previewColor && (
        <span className="pointer-events-none absolute inset-0 opacity-55" style={{ backgroundColor: previewColor }} />
      )}
      {tinted && <span className="pointer-events-none absolute inset-0 rounded-[2px] ring-[2.5px] ring-inset ring-danger" />}
      {clueArea !== null && clueShape !== null && (
        <span
          // min-w-0/min-h-0 override the flex item's default min-width/height:auto (= its
          // content's own min-content size) — without them, a two-digit number's own
          // intrinsic width can win out over a narrow 'tall' badge's aspect-ratio class
          // below, silently widening it until it's nearly indistinguishable from
          // 'square'. The smaller font for 2+ digit clues keeps that content narrow
          // enough to actually fit within the fixed side instead of just being clipped
          // once these stop the box from stretching to make room for it.
          className={`relative z-10 flex min-w-0 min-h-0 items-center justify-center rounded-md px-1.5 leading-none font-bold ${
            String(clueArea).length >= 2 ? 'text-[min(2.6vw,11px)]' : 'text-[min(3.4vw,15px)]'
          } ${SHAPE_BADGE_CLASS[clueShape]} ${
            fillColor && !tinted
              ? 'bg-white/90 text-[oklch(30%_0.03_60)] shadow-[0_1px_3px_rgb(0_0_0/0.1)]'
              : 'bg-surface text-accent shadow-[inset_0_0_0_2px_var(--color-accent)]'
          }`}
          style={badgeShapeCss(badgeShape)}
        >
          {clueArea}
        </span>
      )}
    </button>
  )
}

export const PatchesCell = memo(PatchesCellImpl)
