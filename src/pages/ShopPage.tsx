import { useEffect, useState } from 'react'
import { CoinBalance } from '../components/CoinBalance'
import { TabBar } from '../components/TabBar'
import { useSkin } from '../hooks/useSkin'
import { SKINS } from '../skins'
import { getSettings, getTotalSolved } from '../storage/db'

function swatches16(colors: string[]): string[] {
  return Array.from({ length: 16 }, (_, i) => colors[i % colors.length])
}

export default function ShopPage() {
  const { skin: equippedSkin, ownedSkins, buyAndEquip } = useSkin()
  const [coins, setCoins] = useState(0)
  const [totalSolved, setTotalSolved] = useState(0)

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => !cancelled && setCoins(s.coins))
    getTotalSolved().then((n) => !cancelled && setTotalSolved(n))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main
      data-force-theme="dark"
      className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] text-ink"
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
            }
          }

          return (
            <div key={s.id} className={`flex flex-col gap-2 rounded-[18px] bg-surface p-2.5 ${isEquipped ? 'ring-2 ring-accent' : ''}`}>
              <div className="grid grid-cols-4 gap-0.5 overflow-hidden rounded-[9px]">
                {swatches16(s.colors).map((c, i) => (
                  <div key={i} className="aspect-square" style={{ backgroundColor: c }} />
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
