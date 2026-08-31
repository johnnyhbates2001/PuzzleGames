import { useEffect } from 'react'
import { useEquippedCosmetic } from '../hooks/useCosmetics'

/** Stamps the equipped accent-theme cosmetic onto <html> as data-accent-theme, mirroring
 *  how useTheme.ts stamps data-theme — see index.css's :root[data-accent-theme=...]
 *  rules. Renders nothing; a plain useEffect can't live inside CosmeticsProvider itself
 *  without every consumer re-rendering on every DOM write, so it's its own tiny
 *  component mounted once at the app root. */
export function AccentThemeEffect() {
  const accentTheme = useEquippedCosmetic('accentTheme')

  useEffect(() => {
    if (accentTheme === 'violet') document.documentElement.removeAttribute('data-accent-theme')
    else document.documentElement.setAttribute('data-accent-theme', accentTheme)
  }, [accentTheme])

  return null
}
