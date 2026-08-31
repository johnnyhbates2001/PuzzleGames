import { useEffect, useRef, useState } from 'react'
import { CoinBalance } from '../components/CoinBalance'
import { TabBar } from '../components/TabBar'
import { CheckIcon, FlameIcon, LockIcon } from '../components/icons'
import { useSkin } from '../hooks/useSkin'
import { SKINS, type Skin } from '../skins'
import { getSettings, getTotalSolved } from '../storage/db'
import { getHighestChapterCompleted } from '../games/chapters'

type Filter = 'all' | 'owned' | 'rewards'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'owned', label: 'Owned' },
  { value: 'rewards', label: 'Rewards' },
]

function isRewardSkin(s: Skin): boolean {
  return !!s.locked && 'chapterNeeded' in s.locked
}

function lockLabel(locked: NonNullable<Skin['locked']>): string {
  return 'solvesNeeded' in locked ? `Locked · ${locked.solvesNeeded} solves` : `Locked · Chapter ${locked.chapterNeeded}`
}

function isSkinLocked(locked: NonNullable<Skin['locked']>, totalSolved: number, highestChapter: number): boolean {
  return 'solvesNeeded' in locked ? totalSolved < locked.solvesNeeded : highestChapter < locked.chapterNeeded
}

// The equip cross-fade + ring-flash (see index.css) both finish comfortably within this
// window — the window `justEquippedId` stays set for, so it's cleared once both are done.
const EQUIP_ANIM_MS = 700

export default function ShopPage() {
  const { skin: equippedSkin, ownedSkins, buyAndEquip } = useSkin()
  const [coins, setCoins] = useState(0)
  const [totalSolved, setTotalSolved] = useState(0)
  const [highestChapter, setHighestChapter] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  // The skin whose card should be playing the equip cross-fade/ring-flash right now —
  // set the instant a tap successfully equips a skin, cleared once the animation
  // window elapses, so it only ever plays for the tile that was just tapped, never for
  // whichever skin happens to already be equipped on mount/re-render.
  const [justEquippedId, setJustEquippedId] = useState<string | null>(null)
  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => !cancelled && setCoins(s.coins))
    getTotalSolved().then((n) => !cancelled && setTotalSolved(n))
    getHighestChapterCompleted().then((n) => !cancelled && setHighestChapter(n))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => clearTimeout(flipTimeoutRef.current), [])

  const visibleSkins = SKINS.filter((s) => {
    if (filter === 'owned') return ownedSkins.includes(s.id)
    if (filter === 'rewards') return isRewardSkin(s)
    return true
  })

  return (
    <main
      data-force-theme="dark"
      className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] text-ink"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight">Shop</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {ownedSkins.length} of {SKINS.length} owned
          </p>
        </div>
        <CoinBalance amount={coins} />
      </div>

      <div className="flex gap-1 rounded-full bg-surface p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`h-9 flex-1 rounded-full text-[13px] font-bold transition ${
              filter === f.value ? 'bg-accent text-white' : 'text-ink-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {visibleSkins.map((s) => {
          const owned = ownedSkins.includes(s.id)
          const isEquipped = equippedSkin.id === s.id
          const isLocked = !!s.locked && !owned && isSkinLocked(s.locked, totalSolved, highestChapter)
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
              flipTimeoutRef.current = setTimeout(() => setJustEquippedId(null), EQUIP_ANIM_MS)
            }
          }
          const flipping = justEquippedId === s.id

          return (
            <div
              key={s.id}
              className={`flex flex-col gap-2 rounded-[18px] bg-surface p-2.5 ring-2 transition-shadow duration-300 ${
                isEquipped ? 'ring-accent' : 'ring-transparent'
              } ${flipping ? 'anim-ring-flash' : ''}`}
            >
              <div key={flipping ? 'flip' : 'still'} className={`grid grid-cols-3 gap-0.5 overflow-hidden rounded-[9px] ${flipping ? 'anim-cross-fade' : ''}`}>
                {s.colors.slice(0, 6).map((c, i) => (
                  <div key={i} className="aspect-square" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div>
                <p className="text-[12.5px] font-bold text-ink">{s.name}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-ink-muted">
                  {isLocked ? lockLabel(s.locked!) : s.tag}
                </p>
              </div>
              <button
                type="button"
                onClick={handleTap}
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
                    {s.price} coins
                  </>
                ) : (
                  'Equip'
                )}
              </button>
            </div>
          )
        })}
      </div>

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
