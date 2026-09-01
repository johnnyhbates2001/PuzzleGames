import { REGION_COLORS } from './Cell'
import { CrownIcon, XMarkIcon } from './icons'

/** A small, hand-built illustrative example sitting beside the "How to play" title —
 *  not real puzzle data, just enough of each game's visual language (region colors,
 *  marks, a path stub) to read as a worked example at a glance. One per game, keyed
 *  by GameDefinition.id (see games/registry.ts). */
export function RulesMiniBoard({ gameId }: { gameId: string }) {
  switch (gameId) {
    case 'queens':
      return <QueensMiniBoard />
    case 'sudoku':
      return <SudokuMiniBoard />
    case 'zip':
      return <ZipMiniBoard />
    case 'patches':
      return <PatchesMiniBoard />
    case 'nonogram':
      return <NonogramMiniBoard />
    case 'wordle':
      return <WordleMiniBoard />
    default:
      return null
  }
}

function QueensMiniBoard() {
  const [red, , yellow, green, , sky] = REGION_COLORS
  const cells: { color: string; icon?: 'crown' | 'x' }[] = [
    { color: red },
    { color: red, icon: 'crown' },
    { color: yellow },
    { color: green },
    { color: green, icon: 'x' },
    { color: yellow, icon: 'x' },
    { color: sky },
    { color: sky },
    { color: sky, icon: 'crown' },
  ]
  return (
    <div className="grid size-[70px] shrink-0 grid-cols-3 grid-rows-3 gap-[3px]">
      {cells.map((cell, i) => (
        <div key={i} className="flex items-center justify-center rounded-[5px]" style={{ backgroundColor: cell.color }}>
          {cell.icon === 'crown' && <CrownIcon size={13} className="text-ink" />}
          {cell.icon === 'x' && <XMarkIcon size={9} className="text-ink/55" />}
        </div>
      ))}
    </div>
  )
}

function SudokuMiniBoard() {
  const cells = [5, null, 3, null, 7, null, 8, null, 2]
  return (
    <div className="grid size-[70px] shrink-0 grid-cols-3 grid-rows-3 gap-[2px] overflow-hidden rounded-[8px] border-2 border-grid-line-strong">
      {cells.map((n, i) => (
        <div key={i} className="flex items-center justify-center bg-surface font-mono text-[15px] font-bold text-ink">
          {n ?? ''}
        </div>
      ))}
    </div>
  )
}

function ZipMiniBoard() {
  const inPath = new Set([0, 1, 4])
  return (
    <div className="relative size-[70px] shrink-0 overflow-hidden rounded-[8px] border-2 border-grid-line-strong">
      <div className="grid size-full grid-cols-3 grid-rows-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className={`flex items-center justify-center border-[0.5px] border-grid-gap ${inPath.has(i) ? 'bg-accent-tint' : 'bg-surface'}`}>
            {i === 0 && (
              <span className="flex size-[60%] items-center justify-center rounded-full bg-white text-[10px] font-bold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.18)]">
                1
              </span>
            )}
            {i === 4 && (
              <span className="flex size-[60%] items-center justify-center rounded-full bg-white text-[10px] font-bold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.18)]">
                2
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PatchesMiniBoard() {
  const [, orange] = REGION_COLORS
  return (
    <div className="grid size-[70px] shrink-0 grid-cols-3 grid-rows-3 gap-[2px] overflow-hidden rounded-[8px] border-2 border-grid-line-strong bg-grid-gap">
      <div className="relative col-span-2 flex items-center justify-center" style={{ backgroundColor: orange }}>
        <span className="flex size-[55%] items-center justify-center rounded-md bg-white/90 text-[13px] font-bold text-[oklch(30%_0.03_60)] shadow-[0_1px_3px_rgb(0_0_0/0.1)]">
          2
        </span>
      </div>
      <div className="bg-surface" />
      <div className="bg-surface" />
      <div className="bg-surface" />
      <div className="bg-surface" />
      <div className="bg-surface" />
      <div className="bg-surface" />
    </div>
  )
}

function NonogramMiniBoard() {
  const filled = new Set([0, 1, 4, 8])
  const marked = new Set([3])
  return (
    <div className="grid size-[70px] shrink-0 grid-cols-3 grid-rows-3 gap-[2px] overflow-hidden rounded-[8px] border-2 border-grid-line-strong">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="relative flex items-center justify-center bg-surface">
          {filled.has(i) && <span className="absolute inset-[15%] rounded-[2px] bg-accent" />}
          {marked.has(i) && (
            <span className="relative flex size-[45%] items-center justify-center text-ink-muted">
              <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function WordleMiniBoard() {
  const tiles: { letter: string; state: 'correct' | 'present' | 'absent' }[] = [
    { letter: 'C', state: 'correct' },
    { letter: 'R', state: 'absent' },
    { letter: 'A', state: 'present' },
    { letter: 'B', state: 'absent' },
  ]
  const tone: Record<(typeof tiles)[number]['state'], string> = {
    correct: 'bg-accent text-white',
    present: 'bg-diff-medium text-white',
    absent: 'bg-bg text-ink-muted',
  }
  return (
    <div className="flex h-[70px] shrink-0 items-center gap-1.5">
      {tiles.map((tile, i) => (
        <span key={i} className={`flex size-[30px] items-center justify-center rounded-[6px] text-[15px] font-bold ${tone[tile.state]}`}>
          {tile.letter}
        </span>
      ))}
    </div>
  )
}
