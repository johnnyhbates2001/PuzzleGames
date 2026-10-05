// Purely decorative — a 3x3 corner of a Killer board: two dashed cages with sum labels
// and one placed digit, evoking the mechanic without needing real puzzle data.
const CAGE_OF = [0, 0, 1, 2, 0, 1, 2, 2, 1]
const LABELS: Record<number, string> = { 0: '12', 2: '9', 3: '15' }
const DIGITS: Record<number, number> = { 4: 7 }

export function KillerGridPreview() {
  return (
    <div className="grid size-full grid-cols-3 gap-0.5 [container-type:inline-size]">
      {CAGE_OF.map((cage, i) => {
        const r = Math.floor(i / 3)
        const c = i % 3
        const same = (rr: number, cc: number) => rr >= 0 && rr < 3 && cc >= 0 && cc < 3 && CAGE_OF[rr * 3 + cc] === cage
        const line = '1.5px dashed color-mix(in oklch, var(--color-ink) 45%, transparent)'
        return (
          <div key={i} className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[3px] bg-surface">
            <span
              className="absolute inset-[2px]"
              style={{
                borderTop: same(r - 1, c) ? undefined : line,
                borderBottom: same(r + 1, c) ? undefined : line,
                borderLeft: same(r, c - 1) ? undefined : line,
                borderRight: same(r, c + 1) ? undefined : line,
              }}
            />
            {LABELS[i] && <span className="absolute top-[3px] left-[4px] text-[11cqw] leading-none font-bold text-ink-muted">{LABELS[i]}</span>}
            {DIGITS[i] && <span className="text-[22cqw] leading-none font-bold text-accent">{DIGITS[i]}</span>}
          </div>
        )
      })}
    </div>
  )
}
