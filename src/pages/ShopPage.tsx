import { useEffect, useRef, useState } from 'react'
import { CoinBalance } from '../components/CoinBalance'
import { TabBar } from '../components/TabBar'
import { useSkin } from '../hooks/useSkin'
import { SKINS } from '../skins'
import { getSettings, getTotalSolved } from '../storage/db'

function swatches16(colors: string[]): string[] {
  return Array.from({ length: 16 }, (_, i) => colors[i % colors.length])
}

const SWATCH_FLIP_STAGGER_MS = 30
const SWATCH_FLIP_DURATION_MS = 460
// Total time the last swatch's flip needs (15 * stagger + its own duration) — the
// window `justEquippedId` stays set for, so every tile finishes before it's cleared.
const SWATCH_FLIP_TOTAL_MS = 15 * SWATCH_FLIP_STAGGER_MS + SWATCH_FLIP_DURATION_MS

export default function ShopPage() {
  const { skin: equippedSkin, ownedSkins, buyAndEquip } = useSkin()
  const [coins, setCoins] = useState(0)
  const [totalSolved, setTotalSolved] = useState(0)
  // The skin whose swatches should be playing the equip-flip right now — set the
  // instant a tap successfully equips a skin, cleared once every staggered swatch has
  // finished, so the flip only ever plays for the tile that was just tapped, never for
  // whichever skin happens to already be equipped on mount/re-render.
  const [justEquippedId, setJustEquippedId] = useState<string | null>(null)
  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => !cancelled && setCoins(s.coins))
    getTotalSolved().then((n) => !cancelled && setTotalSolved(n))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => clearTimeout(flipTimeoutRef.current), [])

  return (
    <main
      data-force-theme="dark"
      className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] text-ink"
    >
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[30px] font-extrabold tracking-tight">Shop</h1>
        <CoinBalance amount={coins} />
      </div>

      <p className="text-[13px] font-bold tracking-wide text-ink-muted uppercase">Board skins</p>
      <div className="grid grid-cols-3 gap-2.5">
        {SKINS.map((s) => {
          const owned = ownedSkins.includes(s.id)
          const isEquipped = equippedSkin.id === s.id
          const isLocked = !!s.locked && !owned && totalSolved < s.locked.solvesNeeded
          // Sunset/Mono Ink/Forest cost coins; Candy/Midnight/an unlocked Neon are free
          // to claim (first tap just equips them at 0 cost, marking them owned).
          const needsPurchase = !owned && !isLocked && s.price !== null

          async function handleTap() {
            if (isEquipped || isLocked) return
            const ok = await buyAndEquip(s.id, needsPurchase ? (s.price ?? 0) : 0)
            if (ok) {
              const settings = await getSettings()
              setCoins(settings.coins)
              setJustEquippedId(s.id)
              clearTimeout(flipTimeoutRef.current)
              flipTimeoutRef.current = setTimeout(() => setJustEquippedId(null), SWATCH_FLIP_TOTAL_MS)
            }
          }
          const flipping = justEquippedId === s.id

          return (
            <div
              key={s.id}
              className={`flex flex-col gap-2 rounded-[18px] bg-surface p-2.5 ring-2 transition-shadow duration-300 ${isEquipped ? 'ring-accent' : 'ring-transparent'}`}
            >
              <div className="grid grid-cols-4 gap-0.5 overflow-hidden rounded-[9px] [perspective:400px]">
                {swatches16(s.colors).map((c, i) => (
                  <div
                    key={i}
                    className={`aspect-square ${flipping ? 'anim-skin-flip' : ''}`}
                    style={{ backgroundColor: c, animationDelay: flipping ? `${i * SWATCH_FLIP_STAGGER_MS}ms` : undefined }}
                  />
                ))}
              </div>
              <div>
                <p className="text-[12.5px] font-bold text-ink">{s.name}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-ink-muted">
                  {isLocked ? `Locked · ${s.locked!.solvesNeeded} solves` : s.tag}
                </p>
              </div>
              <button
                type="button"
                onClick={handleTap}
                disabled={isLocked}
                className={`flex items-center justify-center gap-1 rounded-full py-1.5 text-[11.5px] font-bold ${
                  isEquipped
                    ? 'bg-accent-tint text-accent'
                    : isLocked
                      ? 'bg-bg text-ink-muted opacity-60'
                      : needsPurchase
                        ? 'bg-[oklch(80%_0.14_85)] text-[oklch(25%_0.06_75)]'
                        : 'bg-bg text-ink'
                }`}
              >
                {isEquipped ? 'Equipped' : isLocked ? 'Locked' : needsPurchase ? `${s.price} coins` : 'Equip'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 rounded-[20px] bg-surface p-3.5">
        <span className="text-xl">🔥</span>
        <div className="flex-1">
          <p className="text-[13.5px] font-bold text-ink">Daily bonus</p>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">First solve each day pays double.</p>
        </div>
      </div>

      <TabBar active="shop" />
    </main>
  )
}
