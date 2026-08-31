import { useEffect, useRef, useState } from 'react'
import { CoinBalance } from '../components/CoinBalance'
import { TabBar } from '../components/TabBar'
import { FlameIcon } from '../components/icons'
import { ShopTile } from '../components/ShopTile'
import { CosmeticPreview } from '../components/CosmeticPreview'
import { useSkin } from '../hooks/useSkin'
import { useCosmetics } from '../hooks/useCosmetics'
import { SKINS } from '../skins'
import { getSettings, getTotalSolved } from '../storage/db'
import { getHighestChapterCompleted, getHighestEndlessRankIndex } from '../games/chapters'
import { buildAchievementContext } from '../achievements/context'
import type { AchievementContext } from '../achievements/definitions'
import {
  COSMETIC_CATEGORIES,
  cosmeticLockLabel,
  isCosmeticLocked,
  type CosmeticCategory,
  type CosmeticUnlockContext,
} from '../cosmetics'

// The equip cross-fade + ring-flash (see index.css) both finish comfortably within this
// window — the window the "just equipped" marker stays set for, so it's cleared once
// both are done.
const EQUIP_ANIM_MS = 700

export default function ShopPage() {
  const { skin: equippedSkin, ownedSkins, buyAndEquip: buySkinAndEquip } = useSkin()
  const { equipped, owned, buyAndEquip: buyCosmeticAndEquip } = useCosmetics()
  const [coins, setCoins] = useState(0)
  const [unlockCtx, setUnlockCtx] = useState<CosmeticUnlockContext | null>(null)
  // Which tile (category + id) should be playing the equip cross-fade/ring-flash right
  // now — 'skin' is its own pseudo-category since board skins live on a separate hook.
  const [justEquipped, setJustEquipped] = useState<{ category: CosmeticCategory | 'skin'; id: string } | null>(null)
  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => !cancelled && setCoins(s.coins))
    Promise.all([getTotalSolved(), getHighestChapterCompleted(), getHighestEndlessRankIndex(), buildAchievementContext()]).then(
      ([totalSolved, highestChapter, highestEndlessRankIndex, achievementCtx]: [number, number, number, AchievementContext]) => {
        if (cancelled) return
        setUnlockCtx({ totalSolved, highestChapter, highestEndlessRankIndex, achievementCtx })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => clearTimeout(flipTimeoutRef.current), [])

  function markJustEquipped(category: CosmeticCategory | 'skin', id: string) {
    setJustEquipped({ category, id })
    clearTimeout(flipTimeoutRef.current)
    flipTimeoutRef.current = setTimeout(() => setJustEquipped(null), EQUIP_ANIM_MS)
  }

  async function refreshCoins() {
    const settings = await getSettings()
    setCoins(settings.coins)
  }

  return (
    <main
      data-force-theme="dark"
      className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] text-ink"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight">Shop</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {ownedSkins.length} of {SKINS.length} skins owned
          </p>
        </div>
        <CoinBalance amount={coins} />
      </div>

      <div className="-mx-4 sticky top-0 z-10 overflow-x-auto bg-bg/92 px-4 py-2.5 backdrop-blur-sm [scrollbar-width:none]">
        <div className="flex gap-1.5 whitespace-nowrap">
          <a href="#sec-skins" className="rounded-full bg-surface px-3 py-1.5 text-[11.5px] font-bold text-ink">
            Skins
          </a>
          {COSMETIC_CATEGORIES.map((c) => (
            <a key={c.key} href={`#sec-${c.key}`} className="rounded-full bg-surface px-3 py-1.5 text-[11.5px] font-bold text-ink">
              {c.label.split(' · ')[0]}
            </a>
          ))}
        </div>
      </div>

      <section id="sec-skins">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-bold tracking-wide text-ink-muted uppercase">Board skins</p>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          {SKINS.map((s) => {
            const isOwned = ownedSkins.includes(s.id)
            const isEquipped = equippedSkin.id === s.id
            const isLocked = !!s.locked && !isOwned && !!unlockCtx && isCosmeticLocked(s.locked, unlockCtx)
            const needsPurchase = !isOwned && !isLocked && s.price !== null

            async function handleTap() {
              if (isEquipped || isLocked) return
              const ok = await buySkinAndEquip(s.id, needsPurchase ? (s.price ?? 0) : 0)
              if (ok) {
                await refreshCoins()
                markJustEquipped('skin', s.id)
              }
            }

            return (
              <ShopTile
                key={s.id}
                name={s.name}
                subtitle={isLocked ? cosmeticLockLabel(s.locked!) : s.tag}
                isEquipped={isEquipped}
                isLocked={isLocked}
                needsPurchase={needsPurchase}
                price={s.price}
                flipping={justEquipped?.category === 'skin' && justEquipped.id === s.id}
                onTap={handleTap}
                preview={
                  <div className="grid grid-cols-3 gap-0.5">
                    {s.colors.slice(0, 6).map((c, i) => (
                      <div key={i} className="aspect-square" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                }
              />
            )
          })}
        </div>
      </section>

      {COSMETIC_CATEGORIES.map((categoryDef) => (
        <section id={`sec-${categoryDef.key}`} key={categoryDef.key}>
          <p className="text-[13px] font-bold tracking-wide text-ink-muted uppercase">{categoryDef.label}</p>
          <p className="mt-1 text-[11.5px] text-ink-muted">{categoryDef.blurb}</p>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            {categoryDef.items.map((item) => {
              const isOwned = item.price === null && !item.locked ? true : (owned[categoryDef.key]?.includes(item.id) ?? false)
              const isEquipped = equipped[categoryDef.key] === item.id
              const isLocked = !!item.locked && !isOwned && !!unlockCtx && isCosmeticLocked(item.locked, unlockCtx)
              const needsPurchase = !isOwned && !isLocked && item.price !== null

              async function handleTap() {
                if (isEquipped || isLocked) return
                const ok = await buyCosmeticAndEquip(categoryDef.key, item.id, needsPurchase ? (item.price ?? 0) : 0)
                if (ok) {
                  await refreshCoins()
                  markJustEquipped(categoryDef.key, item.id)
                }
              }

              return (
                <ShopTile
                  key={item.id}
                  name={item.name}
                  subtitle={isLocked ? cosmeticLockLabel(item.locked!) : item.tag}
                  isEquipped={isEquipped}
                  isLocked={isLocked}
                  needsPurchase={needsPurchase}
                  price={item.price}
                  flipping={justEquipped?.category === categoryDef.key && justEquipped.id === item.id}
                  onTap={handleTap}
                  preview={<CosmeticPreview category={categoryDef.key} id={item.id} />}
                />
              )
            })}
          </div>
        </section>
      ))}

      <div className="flex items-center gap-3 rounded-[20px] bg-surface p-3.5">
        <span className="text-accent">
          <FlameIcon size={20} />
        </span>
        <div className="flex-1">
          <p className="text-[13.5px] font-bold text-ink">Daily bonus</p>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">First solve each day pays double.</p>
        </div>
      </div>

      <TabBar active="shop" />
    </main>
  )
}
