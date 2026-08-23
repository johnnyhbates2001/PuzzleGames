import { useEffect, useRef, useState } from 'react'

interface CoinBalanceProps {
  amount: number
  className?: string
}

export function CoinBalance({ amount, className }: CoinBalanceProps) {
  const prevRef = useRef(amount)
  const [bump, setBump] = useState(false)

  useEffect(() => {
    const increased = amount > prevRef.current
    prevRef.current = amount
    if (!increased) return
    setBump(true)
    const t = setTimeout(() => setBump(false), 400)
    return () => clearTimeout(t)
  }, [amount])

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface py-1.5 pr-3 pl-2 shadow-card ${bump ? 'anim-bump' : ''} ${className ?? ''}`}
    >
      <span className="size-4 rounded-full bg-[oklch(80%_0.14_85)] box-border border-[2.5px] border-[oklch(68%_0.15_75)]" />
      <span className="font-mono text-[13px] font-bold text-ink tabular-nums">{amount}</span>
    </div>
  )
}
