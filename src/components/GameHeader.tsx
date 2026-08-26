import { useEffect, useState, type ReactNode } from 'react'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import { Timer } from './Timer'
import { CoinBalance } from './CoinBalance'
import { getSettings } from '../storage/db'

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
  const [zenMode, setZenMode] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => !cancelled && setZenMode(s.zenMode))
    return () => {
      cancelled = true
    }
  }, [])

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
      {zenMode ? (
        <span className="rounded-full bg-accent-tint px-3 py-1.5 text-xs font-semibold text-accent">🧘 Zen mode</span>
      ) : (
        <Timer elapsedMs={elapsedMs} runStartedAt={runStartedAt} />
      )}
      {right ?? <CoinBalance amount={coins} />}
    </div>
  )
}
