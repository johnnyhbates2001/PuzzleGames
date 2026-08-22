// Sparse sample pattern (0 = blank) evoking a puzzle-in-progress, purely decorative.
const SAMPLE_DIGITS = [5, 0, 2, 0, 8, 0, 0, 3, 0]

export function SudokuGridPreview() {
  return (
    <div className="grid size-full grid-cols-3 gap-0.5">
      {SAMPLE_DIGITS.map((d, i) => (
        <div
          key={i}
          className="flex aspect-square items-center justify-center rounded-[3px] bg-surface text-[10px] font-bold text-ink-muted"
        >
          {d !== 0 ? d : ''}
        </div>
      ))}
    </div>
  )
}
