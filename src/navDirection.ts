import type { To } from 'react-router-dom'

export type NavDirection = 'forward' | 'back' | 'peer'

/** Peers of Home rather than children of it — even though '/shop' etc. are one path
 *  segment deep, they sit alongside Home in the route tree, not below it. */
const TOP_LEVEL_PEERS = new Set(['/', '/shop', '/stats', '/achievements'])

/** Route-tree depth used to classify a navigation's direction (see navDirection):
 *  '/' → 0 · '/queens' → 1 · '/queens/:d' → 2 · '/queens/:d/complete' → 3. */
export function navDepth(pathname: string): number {
  if (TOP_LEVEL_PEERS.has(pathname)) return 0
  return pathname.split('/').filter(Boolean).length
}

function toPathname(to: To): string {
  if (typeof to === 'string') return to.split('?')[0].split('#')[0]
  return to.pathname ?? ''
}

/** Classifies a navigation as forward (pushing deeper into the route tree), back
 *  (popping back out), or peer (lateral, including into/out of the Complete screen —
 *  depth 3 always fades rather than slides, so the solve-sweep's tail can run
 *  straight into its sheet-up instead of fighting a whole-page slide). */
export function navDirection(fromPathname: string, to: To): NavDirection {
  const fromDepth = navDepth(fromPathname)
  const toDepth = navDepth(toPathname(to))
  if (fromDepth === 3 || toDepth === 3) return 'peer'
  if (toDepth > fromDepth) return 'forward'
  if (toDepth < fromDepth) return 'back'
  return 'peer'
}

export function setNavDirection(direction: NavDirection): void {
  document.documentElement.dataset.nav = direction
}
