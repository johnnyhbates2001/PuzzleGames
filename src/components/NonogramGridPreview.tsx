// Purely decorative — a fixed 5x5 fill pattern evoking the nonogram mechanic without
// needing real puzzle data.
const FILLED = new Set([1, 3, 5, 7, 9, 11, 12, 13, 16, 18, 21, 23])

export function NonogramGridPreview() {
  return (
    <div className="grid size-full grid-cols-5 grid-rows-5 gap-0.5">
      {Array.from({ length: 25 }, (_, i) => (
        <div key={i} className={`aspect-square rounded-[2px] border border-border-dashed ${FILLED.has(i) ? 'bg-ink' : 'bg-bg'}`} />
      ))}
    </div>
  )
}
