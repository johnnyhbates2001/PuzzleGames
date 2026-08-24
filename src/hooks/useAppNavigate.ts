import { useCallback } from 'react'
import { useLocation, useNavigate, type NavigateFunction, type NavigateOptions, type To } from 'react-router-dom'
import { useReducedMotion } from './useReducedMotion'
import { navDirection, setNavDirection } from '../navDirection'

/** Drop-in `useNavigate` replacement that opts every navigation into a View
 *  Transition (see App.tsx's data router) unless the user prefers reduced motion,
 *  and stamps the transition's direction on `<html>` first — see AppLink for why
 *  the timing (before, not in an effect after) matters. */
export function useAppNavigate(): NavigateFunction {
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const location = useLocation()

  return useCallback(
    ((to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to)
        return
      }
      if (!reducedMotion) setNavDirection(navDirection(location.pathname, to))
      navigate(to, { ...options, viewTransition: !reducedMotion })
    }) as NavigateFunction,
    [navigate, reducedMotion, location.pathname],
  )
}
