import { Link as RouterLink, type LinkProps } from 'react-router-dom'
import { useReducedMotion } from '../hooks/useReducedMotion'

/** Drop-in `Link` replacement that opts navigation into a View Transition unless
 *  the user prefers reduced motion — see App.tsx's data router and useAppNavigate. */
export function AppLink(props: LinkProps) {
  const reducedMotion = useReducedMotion()
  return <RouterLink {...props} viewTransition={!reducedMotion} />
}
