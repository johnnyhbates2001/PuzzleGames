// Purely decorative — a little snake through a 3x3 grid with numbered endpoints,
// evoking the checkpoint-to-checkpoint path without needing real puzzle data.
const PATH_CELLS = [0, 1, 4, 7, 8]

export function ZipGridPreview() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
      {Array.from({ length: 9 }, (_, i) => {
        const inPath = PATH_CELLS.includes(i)
        const isStart = i === PATH_CELLS[0]
        const isEnd = i === PATH_CELLS[PATH_CELLS.length - 1]
        return (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-[3px] ${inPath ? 'bg-accent' : 'bg-surface'}`}
          >
            {isStart && <span className="text-[8px] leading-none font-bold text-white">1</span>}
            {isEnd && <span className="text-[8px] leading-none font-bold text-white">2</span>}
          </div>
        )
      })}
    </div>
  )
}
