import { ChessKingIcon, CrownIcon, DotMarkerIcon, FlameIcon, GemIcon, StarIcon } from './icons'

const GLYPH_BY_MARKER: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  crown: CrownIcon,
  star: StarIcon,
  gem: GemIcon,
  dot: DotMarkerIcon,
  'chess-king': ChessKingIcon,
  flame: FlameIcon,
}

/** Renders whichever glyph the 'queensMarker' cosmetic is equipped to (see cosmetics.ts)
 *  — falls back to the crown for an unrecognized id so a stale equipped value never
 *  renders nothing. Shared by Cell.tsx (the real board) and the Shop's preview tiles. */
export function QueensMarkerGlyph({ marker, className }: { marker: string; className?: string }) {
  const Glyph = GLYPH_BY_MARKER[marker] ?? CrownIcon
  return <Glyph className={className} />
}
