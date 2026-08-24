import { memo } from 'react'

interface ZipCellProps {
  row: number
  col: number
  checkpointNumber: number | null
  inPath: boolean
  isPathEnd: boolean
  connUp: boolean
  connDown: boolean
  connLeft: boolean
  connRight: boolean
  wallRight: boolean
  wallBottom: boolean
  /** True for one render after an illegal move was attempted on this cell — drives
   *  a shake, cleared by the caller once the animation finishes. */
  shake: boolean
  onShakeEnd: () => void
}

function ZipCellImpl({
  row,
  col,
  checkpointNumber,
  inPath,
  isPathEnd,
  connUp,
  connDown,
  connLeft,
  connRight,
  wallRight,
  wallBottom,
  shake,
  onShakeEnd,
}: ZipCellProps) {
  return (
    <button
      type="button"
      data-row={row}
      data-col={col}
      aria-label={checkpointNumber !== null ? `Checkpoint ${checkpointNumber}` : `Row ${row + 1}, column ${col + 1}`}
      className={`relative flex aspect-square touch-none items-center justify-center bg-surface select-none ${
        wallRight ? 'border-r-[3px] border-r-grid-line-strong' : 'border-r border-r-grid-gap'
      } ${wallBottom ? 'border-b-[3px] border-b-grid-line-strong' : 'border-b border-b-grid-gap'} ${
        shake ? 'anim-shake' : ''
      }`}
      onAnimationEnd={shake ? onShakeEnd : undefined}
    >
      {inPath && (
        <span className="pointer-events-none absolute inset-0">
          {connUp && <span className="anim-zip-in absolute top-0 left-1/2 h-1/2 w-[28%] -translate-x-1/2 bg-accent" />}
          {connDown && <span className="anim-zip-in absolute bottom-0 left-1/2 h-1/2 w-[28%] -translate-x-1/2 bg-accent" />}
          {connLeft && <span className="anim-zip-in absolute top-1/2 left-0 h-[28%] w-1/2 -translate-y-1/2 bg-accent" />}
          {connRight && <span className="anim-zip-in absolute top-1/2 right-0 h-[28%] w-1/2 -translate-y-1/2 bg-accent" />}
        </span>
      )}
      {inPath && checkpointNumber === null && (
        <span className={`anim-zip-in relative z-10 rounded-full bg-accent ${isPathEnd ? 'size-[40%]' : 'size-[26%]'}`} />
      )}
      {checkpointNumber !== null && (
        <span
          className={`relative z-20 flex size-[64%] items-center justify-center rounded-full text-[min(3.4vw,15px)] leading-none font-bold ${
            inPath ? 'bg-accent text-white' : 'border-2 border-ink-muted text-ink'
          }`}
        >
          {checkpointNumber}
        </span>
      )}
    </button>
  )
}

export const ZipCell = memo(ZipCellImpl)
