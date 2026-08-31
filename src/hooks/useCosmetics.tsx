import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { buyCosmetic, equipCosmetic, getSettings } from '../storage/db'
import { COSMETIC_CATEGORIES, type CosmeticCategory } from '../cosmetics'

type EquippedMap = Record<CosmeticCategory, string>
type OwnedMap = Record<CosmeticCategory, string[]>

function defaultEquippedMap(): EquippedMap {
  return Object.fromEntries(COSMETIC_CATEGORIES.map((c) => [c.key, c.defaultId])) as EquippedMap
}

function defaultOwnedMap(): OwnedMap {
  return Object.fromEntries(COSMETIC_CATEGORIES.map((c) => [c.key, [] as string[]])) as OwnedMap
}

interface CosmeticsContextValue {
  /** Equipped item id per category — falls back to that category's free default id
   *  (see cosmetics.ts's CosmeticCategoryDef.defaultId) until the player equips
   *  something else. */
  equipped: EquippedMap
  /** Owned item ids per category — a category's default id is always usable even when
   *  absent here (see cosmetics.ts), so this only needs to list non-default items. */
  owned: OwnedMap
  equip: (category: CosmeticCategory, id: string) => void
  /** Buys (if not already owned) and equips. Returns false if coins were insufficient. */
  buyAndEquip: (category: CosmeticCategory, id: string, price: number) => Promise<boolean>
}

const CosmeticsContext = createContext<CosmeticsContextValue | null>(null)

/** Generalized cosmetic-slot system for the 10 Shop Expansion categories (see
 *  cosmetics.ts) — one provider/context instead of 10 near-identical ones, following
 *  the same mount-fetch/optimistic-update shape as SkinProvider/AudioProvider. */
export function CosmeticsProvider({ children }: { children: ReactNode }) {
  const [equipped, setEquipped] = useState<EquippedMap>(defaultEquippedMap)
  const [owned, setOwned] = useState<OwnedMap>(defaultOwnedMap)

  useEffect(() => {
    let cancelled = false
    getSettings().then((settings) => {
      if (cancelled) return
      setEquipped((prev) => {
        const next = { ...prev }
        for (const { key, defaultId } of COSMETIC_CATEGORIES) next[key] = settings.equippedCosmetics[key] ?? defaultId
        return next
      })
      setOwned((prev) => {
        const next = { ...prev }
        for (const { key } of COSMETIC_CATEGORIES) next[key] = settings.ownedCosmetics[key] ?? []
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const equip = useCallback((category: CosmeticCategory, id: string) => {
    setEquipped((prev) => ({ ...prev, [category]: id }))
    void equipCosmetic(category, id)
  }, [])

  const buyAndEquip = useCallback(
    async (category: CosmeticCategory, id: string, price: number) => {
      const ok = await buyCosmetic(category, id, price)
      if (!ok) return false
      setOwned((prev) => (prev[category].includes(id) ? prev : { ...prev, [category]: [...prev[category], id] }))
      equip(category, id)
      return true
    },
    [equip],
  )

  return (
    <CosmeticsContext.Provider value={{ equipped, owned, equip, buyAndEquip }}>{children}</CosmeticsContext.Provider>
  )
}

export function useCosmetics(): CosmeticsContextValue {
  const ctx = useContext(CosmeticsContext)
  if (!ctx) throw new Error('useCosmetics must be used within a CosmeticsProvider')
  return ctx
}

/** Convenience for the common case — a single category's equipped item id. */
export function useEquippedCosmetic(category: CosmeticCategory): string {
  return useCosmetics().equipped[category]
}
