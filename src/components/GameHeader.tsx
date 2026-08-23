import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer } from './Timer'
import { CoinBalance } from './CoinBalance'

interface GameHeaderProps {
  backTo: string
  elapsedMs: number
  runStartedAt: number | null
  coins: number
  /** Overrides the default coin-balance pill in the right slot — Queens uses this for
   *  its Auto-X badge instead. */
  right?: ReactNode
}

export function GameHeader({ backTo, elapsedMs, runStartedAt, coins, right }: GameHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="flex w-full items-center justify-between">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        aria-label="Back"
        className="inline-flex size-9 items-center justify-center rounded-full bg-accent-tint text-accent"
      >
        <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
          <path d="M8 1L1 7.5 8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Timer elapsedMs={elapsedMs} runStartedAt={runStartedAt} />
      {right ?? <CoinBalance amount={coins} />}
    </div>
  )
}
