import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/** Live-updating read of the OS reduced-motion preference — used to gate the
 *  View Transitions API opt-in, which (unlike the CSS keyframes elsewhere in the
 *  app) isn't automatically covered by the `@media (prefers-reduced-motion)` gate. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
