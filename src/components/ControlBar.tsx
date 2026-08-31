import { useRef, type ReactNode } from 'react'
import { LightbulbIcon, LockIcon } from './icons'

interface ControlBarProps {
  /** 1-3 44px icon buttons — Undo, Erase/Clear, per-game toggles. */
  left: ReactNode
  /** Mode toggle or a contextual pill, centered between left and Hint. Omitted = empty spacer. */
  center?: ReactNode
  onOpenHints: () => void
  hintPrice: number
  /** Set by an active endless-boss "No Hints" modifier — see games/chapters.ts. */
  hintsDisabled?: boolean
}

export function ControlBar({ left, center, onOpenHints, hintPrice, hintsDisabled }: ControlBarProps) {
  return (
    <div className="flex h-[60px] w-full items-center gap-1.5 rounded-full bg-surface p-2 shadow-card">
      <div className="flex items-center gap-1">{left}</div>
      <div className="flex flex-1 items-center justify-center">{center}</div>
      <button
        type="button"
        onClick={onOpenHints}
        disabled={hintsDisabled}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-[14px] font-bold text-white disabled:opacity-40"
      >
        <LightbulbIcon size={18} />
        Hint
        {hintsDisabled ? (
          <LockIcon size={13} />
        ) : (
          <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">{hintPrice}</span>
        )}
      </button>
    </div>
  )
}

interface ControlIconButtonProps {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  label: string
  children: ReactNode
  /** Only Sudoku's Clear uses this — fires onClick after a press-and-hold instead of a
   *  tap, so one mis-tap can't wipe a hard board. Release before the hold completes and
   *  nothing happens. */
  holdMs?: number
}

export function ControlIconButton({ onClick, disabled, active, label, children, holdMs }: ControlIconButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const holdHandlers = holdMs
    ? {
        onPointerDown: () => {
          timerRef.current = setTimeout(onClick, holdMs)
        },
        onPointerUp: clearTimer,
        onPointerLeave: clearTimer,
        onPointerCancel: clearTimer,
        onClick: (e: React.MouseEvent) => {
          // Suppress the plain click the hold's own pointerup/pointerdown pair would
          // otherwise also fire — only the hold-timeout path should ever call onClick.
          e.preventDefault()
        },
      }
    : { onClick }

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
        active ? 'bg-accent-tint text-accent' : 'text-ink-muted'
      }`}
      {...holdHandlers}
    >
      {children}
    </button>
  )
}
