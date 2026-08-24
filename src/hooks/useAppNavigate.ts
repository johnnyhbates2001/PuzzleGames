import { useCallback } from 'react'
import { useNavigate, type NavigateFunction, type NavigateOptions, type To } from 'react-router-dom'
import { useReducedMotion } from './useReducedMotion'

/** Drop-in `useNavigate` replacement that opts every navigation into a View
 *  Transition (see App.tsx's data router) unless the user prefers reduced motion. */
export function useAppNavigate(): NavigateFunction {
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()

  return useCallback(
    ((to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to)
        return
      }
      navigate(to, { ...options, viewTransition: !reducedMotion })
    }) as NavigateFunction,
    [navigate, reducedMotion],
  )
}
