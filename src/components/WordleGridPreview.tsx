// A decorative, already-scored sample row — not derived from real puzzle data, just
// enough color variety to read as "Wordle" at a glance (see SudokuGridPreview and
// friends for the same convention on the other games).
const SAMPLE = [
  { letter: 'C', status: 'absent' },
  { letter: 'R', status: 'present' },
  { letter: 'A', status: 'absent' },
  { letter: 'N', status: 'correct' },
  { letter: 'E', status: 'present' },
] as const

const STATUS_CLASS: Record<(typeof SAMPLE)[number]['status'], string> = {
  correct: 'bg-wordle-correct text-white',
  present: 'bg-wordle-present text-white',
  absent: 'bg-surface text-ink-muted border border-border-dashed',
}

export function WordleGridPreview() {
  return (
    <div className="grid size-full grid-cols-5 gap-0.5 [container-type:inline-size]">
      {SAMPLE.map((tile, i) => (
        <div
          key={i}
          className={`flex aspect-square items-center justify-center overflow-hidden rounded-[3px] text-[26cqw] leading-none font-bold ${STATUS_CLASS[tile.status]}`}
        >
          {tile.letter}
        </div>
      ))}
    </div>
  )
}
