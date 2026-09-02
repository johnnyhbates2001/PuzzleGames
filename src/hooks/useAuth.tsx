import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiGet, apiPost, ApiError } from '../api/client'
import type { User } from '../api/types'

interface AuthResult {
  ok: boolean
  error?: string
  /** Only set on signup/recover — the one-time code the caller must show the user. */
  recoveryCode?: string
}

interface AuthContextValue {
  user: User | null
  /** True until the initial GET /me hydration settles — lets callers avoid a
   *  flash of "signed out" UI before we actually know. */
  loading: boolean
  signup: (username: string, password: string) => Promise<AuthResult>
  login: (username: string, password: string) => Promise<AuthResult>
  logout: () => Promise<void>
  recover: (username: string, recoveryCode: string, newPassword: string) => Promise<AuthResult>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function messageFor(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong — check your connection and try again'
}

/** Same mount-fetch/optimistic-update shape as SkinProvider/CosmeticsProvider, but
 *  hydrating from the API instead of IndexedDB — see useSkin.tsx. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const result = await apiGet<{ user: User }>('/me')
      setUser(result.user)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [refresh])

  const signup = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      const result = await apiPost<{ user: User; recoveryCode: string }>('/auth/signup', { username, password })
      setUser(result.user)
      return { ok: true, recoveryCode: result.recoveryCode }
    } catch (error) {
      return { ok: false, error: messageFor(error) }
    }
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      const result = await apiPost<{ user: User }>('/auth/login', { username, password })
      setUser(result.user)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: messageFor(error) }
    }
  }, [])

  const logout = useCallback(async () => {
    await apiPost('/auth/logout').catch(() => {})
    setUser(null)
  }, [])

  const recover = useCallback(async (username: string, recoveryCode: string, newPassword: string): Promise<AuthResult> => {
    try {
      const result = await apiPost<{ user: User; recoveryCode: string }>('/auth/recover', { username, recoveryCode, newPassword })
      setUser(result.user)
      return { ok: true, recoveryCode: result.recoveryCode }
    } catch (error) {
      return { ok: false, error: messageFor(error) }
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, recover, refresh }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
