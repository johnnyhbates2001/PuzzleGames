import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSettings, setHapticsEnabled as setHapticsEnabledDb, setSoundEnabled as setSoundEnabledDb } from '../storage/db'
import { playRawSound, vibrate, type SoundName, type SoundPackId } from '../audio/sfx'
import { useEquippedCosmetic } from './useCosmetics'

interface AudioContextValue {
  soundEnabled: boolean
  hapticsEnabled: boolean
  setSoundEnabled: (enabled: boolean) => void
  setHapticsEnabled: (enabled: boolean) => void
  playSound: (name: SoundName) => void
  buzz: (pattern?: number | number[]) => void
}

const AudioSettingsContext = createContext<AudioContextValue | null>(null)

/** Mirrors useSkin.tsx's shape — a mount-time fetch from IndexedDB, optimistic local
 *  state on toggle, fire-and-forget write-through — so every board/control can play a
 *  sound or buzz without re-fetching settings itself. */
export function AudioProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true)
  const [hapticsEnabled, setHapticsEnabledState] = useState(true)
  const soundPack = useEquippedCosmetic('soundPack') as SoundPackId

  useEffect(() => {
    let cancelled = false
    getSettings().then((settings) => {
      if (cancelled) return
      setSoundEnabledState(settings.soundEnabled)
      setHapticsEnabledState(settings.hapticsEnabled)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled)
    void setSoundEnabledDb(enabled)
  }, [])

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    setHapticsEnabledState(enabled)
    void setHapticsEnabledDb(enabled)
  }, [])

  const playSound = useCallback(
    (name: SoundName) => {
      if (soundEnabled) playRawSound(name, soundPack)
    },
    [soundEnabled, soundPack],
  )

  const buzz = useCallback(
    (pattern: number | number[] = 10) => {
      if (hapticsEnabled) vibrate(pattern)
    },
    [hapticsEnabled],
  )

  return (
    <AudioSettingsContext.Provider
      value={{ soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled, playSound, buzz }}
    >
      {children}
    </AudioSettingsContext.Provider>
  )
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioSettingsContext)
  if (!ctx) throw new Error('useAudio must be used within an AudioProvider')
  return ctx
}
