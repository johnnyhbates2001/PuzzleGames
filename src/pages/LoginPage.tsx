import { useState, type FormEvent } from 'react'
import { AppLink as Link } from '../components/AppLink'
import { useAppNavigate } from '../hooks/useAppNavigate'
import { useAuth } from '../hooks/useAuth'
import { TextField } from '../components/TextField'
import { ChevronLeftIcon } from '../components/icons'

export default function LoginPage() {
  const navigate = useAppNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await login(username, password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong')
      return
    }
    navigate('/')
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] text-ink">
      <Link to="/" className="inline-flex size-9 items-center justify-center rounded-full bg-accent-tint text-accent" aria-label="Home">
        <ChevronLeftIcon size={16} />
      </Link>

      <div>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight">Sign in</h1>
        <p className="mt-1 text-[13.5px] text-ink-muted">Welcome back.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <TextField
          id="username"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p className="text-[13px] font-medium text-danger">{error}</p>}

        <button type="submit" disabled={submitting} className="mt-1 w-full rounded-full bg-accent py-3 font-semibold text-white disabled:opacity-60">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 text-[13.5px] text-ink-muted">
        <Link to="/recover" className="font-semibold text-accent">
          Forgot your password?
        </Link>
        <p>
          New here?{' '}
          <Link to="/signup" className="font-semibold text-accent">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}
