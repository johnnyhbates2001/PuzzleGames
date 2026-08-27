import { useCallback, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark' | 'yellow'

const STORAGE_KEY = 'theme'

function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'yellow') return stored
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back to system
  }
  return 'system'
}

/** Persists the theme preference and applies it to <html> — see the matching bootstrap
 *  script in index.html, which applies the saved value before first paint. */
export function useTheme(): [ThemePreference, (theme: ThemePreference) => void] {
  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme)

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next)
    if (next === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', next)
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage unavailable — theme still applies for this session
    }
  }, [])

  return [theme, setTheme]
}
