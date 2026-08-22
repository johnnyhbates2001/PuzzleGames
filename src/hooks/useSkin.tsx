import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { buySkin as buySkinDb, equipSkin as equipSkinDb, getSettings } from '../storage/db'
import { DEFAULT_SKIN_ID, getSkin, type Skin } from '../skins'

interface SkinContextValue {
  skin: Skin
  ownedSkins: string[]
  setSkin: (id: string) => void
  /** Buys (if not already owned) and equips. Returns false if coins were insufficient. */
  buyAndEquip: (id: string, price: number) => Promise<boolean>
}

const SkinContext = createContext<SkinContextValue | null>(null)

/** Wraps the app so every board/preview re-renders on skin change, regardless of where
 *  in the tree it lives — REGION_COLORS used to be a static import read by 5+ components,
 *  which a skin system can't drive without either prop-drilling or shared reactive state. */
export function SkinProvider({ children }: { children: ReactNode }) {
  const [equippedId, setEquippedId] = useState(DEFAULT_SKIN_ID)
  const [ownedSkins, setOwnedSkins] = useState<string[]>([DEFAULT_SKIN_ID])

  useEffect(() => {
    let cancelled = false
    getSettings().then((settings) => {
      if (cancelled) return
      setEquippedId(settings.equippedSkin)
      setOwnedSkins(settings.ownedSkins)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setSkin = useCallback((id: string) => {
    setEquippedId(id)
    void equipSkinDb(id)
  }, [])

  const buyAndEquip = useCallback(async (id: string, price: number) => {
    const ok = await buySkinDb(id, price)
    if (!ok) return false
    setOwnedSkins((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setSkin(id)
    return true
  }, [setSkin])

  return (
    <SkinContext.Provider value={{ skin: getSkin(equippedId), ownedSkins, setSkin, buyAndEquip }}>
      {children}
    </SkinContext.Provider>
  )
}

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext)
  if (!ctx) throw new Error('useSkin must be used within a SkinProvider')
  return ctx
}

/** Convenience for the common case — just the active palette. */
export function useRegionColors(): string[] {
  return useSkin().skin.colors
}
