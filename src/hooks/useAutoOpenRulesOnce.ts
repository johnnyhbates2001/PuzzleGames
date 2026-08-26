import { useEffect } from 'react'
import { getSettings, markTutorialSeen } from '../storage/db'

/** Auto-opens a game's RulesSheet the first time a player ever reaches this hook for a
 *  given gameId, then never again — see Settings.tutorialSeen. Doubles as the "mini
 *  tutorial": the existing How-to-play sheet is the tutorial, this just decides when it
 *  shows itself without the player needing to tap the info button. */
export function useAutoOpenRulesOnce(gameId: string, setOpen: (open: boolean) => void): void {
  useEffect(() => {
    let cancelled = false
    getSettings().then((settings) => {
      if (cancelled) return
      if (!settings.tutorialSeen.includes(gameId)) {
        setOpen(true)
        void markTutorialSeen(gameId)
      }
    })
    return () => {
      cancelled = true
    }
  }, [gameId, setOpen])
}
