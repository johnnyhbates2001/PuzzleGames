import { REGION_COLORS } from './Cell'

// Purely decorative — a 3x3 grid split into a few colorful "patches", evoking the
// rectangle-tiling mechanic without needing real puzzle data.
const CELL_GROUP = [0, 0, 1, 0, 1, 1, 2, 2, 2]

export function PatchesGridPreview() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
      {CELL_GROUP.map((group, i) => (
        <div key={i} className="aspect-square rounded-[3px]" style={{ backgroundColor: REGION_COLORS[group] }} />
      ))}
    </div>
  )
}
