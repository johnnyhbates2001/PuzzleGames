import type { ReactNode } from 'react'

interface BoostTileProps {
  icon: ReactNode
  name: string
  description: string
  price: number
  owned: number
  affordable: boolean
  onBuy: () => void
}

/** One stackable Boost card in the Shop's Boosts section — deliberately not ShopTile,
 *  since Boosts are consumables (bought repeatedly, never "owned" outright/equipped)
 *  rather than the collectibles ShopTile's owned/locked/equip states model. */
export function BoostTile({ icon, name, description, price, owned, affordable, onBuy }: BoostTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[18px] bg-surface p-3.5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-accent-tint text-accent">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-ink">{name}</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">{description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-ink-muted">Owned: {owned}</span>
        <button
          type="button"
          disabled={!affordable}
          onClick={onBuy}
          className={`flex items-center gap-1.5 rounded-full py-1.5 px-3 text-[11.5px] font-bold ${
            affordable ? 'bg-[oklch(80%_0.14_85)] text-[oklch(25%_0.06_75)]' : 'bg-bg text-ink-muted opacity-60'
          }`}
        >
          <span className="size-3 rounded-full border-2 border-[oklch(25%_0.06_75)]/60 bg-white/70 box-border" />
          {price} coins
        </button>
      </div>
    </div>
  )
}
