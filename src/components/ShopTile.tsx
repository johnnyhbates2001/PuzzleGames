import type { ReactNode } from 'react'
import { CheckIcon, LockIcon } from './icons'

interface ShopTileProps {
  preview: ReactNode
  name: string
  subtitle: string
  isEquipped: boolean
  isLocked: boolean
  needsPurchase: boolean
  price?: number | null
  flipping: boolean
  onTap: () => void
}

/** One purchasable/equippable cosmetic card — the same markup every category's grid
 *  uses (board skins included), just parameterized by the category-specific preview
 *  node from CosmeticPreview.tsx. Mirrors the tile ShopPage.tsx already had for skins. */
export function ShopTile({ preview, name, subtitle, isEquipped, isLocked, needsPurchase, price, flipping, onTap }: ShopTileProps) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-[18px] bg-surface p-2.5 ring-2 transition-shadow duration-300 ${
        isEquipped ? 'ring-accent' : 'ring-transparent'
      } ${flipping ? 'anim-ring-flash' : ''}`}
    >
      <div key={flipping ? 'flip' : 'still'} className={`overflow-hidden rounded-[9px] ${flipping ? 'anim-cross-fade' : ''} ${isLocked ? 'opacity-55' : ''}`}>
        {preview}
      </div>
      <div>
        <p className="text-[12.5px] font-bold text-ink">{name}</p>
        <p className="mt-0.5 text-[10px] leading-tight text-ink-muted">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onTap}
        disabled={isLocked}
        className={`flex items-center justify-center gap-1.5 rounded-full py-1.5 text-[11.5px] font-bold ${
          isEquipped
            ? 'bg-accent-tint text-accent'
            : isLocked
              ? 'bg-bg text-ink-muted opacity-60'
              : needsPurchase
                ? 'bg-[oklch(80%_0.14_85)] text-[oklch(25%_0.06_75)]'
                : 'bg-bg text-ink'
        }`}
      >
        {isEquipped ? (
          <>
            <CheckIcon size={11} />
            Equipped
          </>
        ) : isLocked ? (
          <>
            <LockIcon size={12} />
            Locked
          </>
        ) : needsPurchase ? (
          <>
            <span className="size-3 rounded-full border-2 border-[oklch(25%_0.06_75)]/60 bg-white/70 box-border" />
            {price} coins
          </>
        ) : (
          'Equip'
        )}
      </button>
    </div>
  )
}
