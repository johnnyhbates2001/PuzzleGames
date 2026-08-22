import { useEffect, useRef } from 'react'

/**
 * Fires onHidden/onVisible on tab hide/show AND window blur/focus — an installed iOS
 * PWA is typically backgrounded rather than fully unloaded, so both signals matter.
 * Callbacks are read from refs so callers can pass fresh inline closures without
 * causing the listeners to be torn down and re-added every render.
 */
export function useAppLifecycle(onHidden: () => void, onVisible: () => void): void {
  const onHiddenRef = useRef(onHidden)
  const onVisibleRef = useRef(onVisible)
  onHiddenRef.current = onHidden
  onVisibleRef.current = onVisible

  useEffect(() => {
    const handleHidden = () => onHiddenRef.current()
    const handleVisible = () => onVisibleRef.current()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleHidden()
      else handleVisible()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleHidden)
    window.addEventListener('focus', handleVisible)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleHidden)
      window.removeEventListener('focus', handleVisible)
    }
  }, [])
}
