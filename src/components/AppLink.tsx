import { Link as RouterLink, useLocation, type LinkProps } from 'react-router-dom'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { navDirection, setNavDirection } from '../navDirection'

/** Drop-in `Link` replacement that opts navigation into a View Transition unless
 *  the user prefers reduced motion — see App.tsx's data router and useAppNavigate.
 *  Also stamps the transition's direction (forward/back/peer, see navDirection) on
 *  `<html>` before the click's own navigation fires, so the CSS in index.css can
 *  branch on it — the View Transition itself starts synchronously inside this same
 *  click handler, so the attribute must already be correct by the time we return. */
export function AppLink({ onClick, to, ...props }: LinkProps) {
  const reducedMotion = useReducedMotion()
  const location = useLocation()

  return (
    <RouterLink
      {...props}
      to={to}
      viewTransition={!reducedMotion}
      onClick={(event) => {
        if (!reducedMotion) setNavDirection(navDirection(location.pathname, to))
        onClick?.(event)
      }}
    />
  )
}
