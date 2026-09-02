import { useState, type FormEvent } from 'react'
import { AppLink as Link } from '../components/AppLink'
import { useAppNavigate } from '../hooks/useAppNavigate'
import { useAuth } from '../hooks/useAuth'
import { TextField } from '../components/TextField'
import { ChevronLeftIcon, CheckIcon } from '../components/icons'

export default function SignupPage() {
  const navigate = useAppNavigate()
  const { signup } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }
    setSubmitting(true)
    const result = await signup(username, password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong')
      return
    }
    setRecoveryCode(result.recoveryCode ?? null)
  }

  async function copyCode() {
    if (!recoveryCode) return
    try {
      await navigator.clipboard.writeText(recoveryCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the code stays
      // visible on screen either way, so this is a nice-to-have, not required.
    }
  }

  if (recoveryCode) {
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] text-ink">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-white">
            <CheckIcon size={22} />
          </span>
          <h1 className="font-display text-[24px] font-extrabold">Save your recovery code</h1>
          <p className="max-w-xs text-[13.5px] text-ink-muted">
            There's no email tied to your account, so this code is the only way back in if you forget your password.
            It's shown once — write it down somewhere safe.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-[22px] bg-surface p-5">
          <span className="font-mono text-[22px] font-bold tracking-wide text-ink">{recoveryCode}</span>
          <button type="button" onClick={copyCode} className="rounded-full bg-bg px-4 py-2 text-[13px] font-semibold text-ink-muted">
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>

        <label className="flex items-center gap-2.5 px-1 text-[13.5px] text-ink">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="size-4 accent-accent" />
          I've saved this code somewhere safe
        </label>

        <button
          type="button"
          disabled={!saved}
          onClick={() => navigate('/')}
          className="w-full rounded-full bg-accent py-3 font-semibold text-white disabled:opacity-40"
        >
          Continue
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] text-ink">
      <Link to="/" className="inline-flex size-9 items-center justify-center rounded-full bg-accent-tint text-accent" aria-label="Home">
        <ChevronLeftIcon size={16} />
      </Link>

      <div>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight">Create account</h1>
        <p className="mt-1 text-[13.5px] text-ink-muted">For syncing progress and playing with friends.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <TextField
          id="username"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          title="3-20 characters: letters, numbers, underscore"
          required
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <TextField
          id="confirm"
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />

        {error && <p className="text-[13px] font-medium text-danger">{error}</p>}

        <button type="submit" disabled={submitting} className="mt-1 w-full rounded-full bg-accent py-3 font-semibold text-white disabled:opacity-60">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-[13.5px] text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent">
          Sign in
        </Link>
      </p>
    </main>
  )
}
