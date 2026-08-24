import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Resets the scroll container to the top on every route change — without this,
 *  #root (the real scroll container, see index.css) keeps the previous page's
 *  scroll offset, which becomes visible as the wrong offset mid-crossfade. */
export function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.getElementById('root')?.scrollTo(0, 0)
  }, [pathname])
  return null
}
