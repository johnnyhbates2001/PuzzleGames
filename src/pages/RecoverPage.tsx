import { useState, type FormEvent } from 'react'
import { AppLink as Link } from '../components/AppLink'
import { useAppNavigate } from '../hooks/useAppNavigate'
import { useAuth } from '../hooks/useAuth'
import { TextField } from '../components/TextField'
import { ChevronLeftIcon, CheckIcon } from '../components/icons'

export default function RecoverPage() {
  const navigate = useAppNavigate()
  const { recover } = useAuth()
  const [username, setUsername] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [nextCode, setNextCode] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await recover(username, recoveryCode, newPassword)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong')
      return
    }
    setNextCode(result.recoveryCode ?? null)
  }

  if (nextCode) {
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] text-ink">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-white">
            <CheckIcon size={22} />
          </span>
          <h1 className="font-display text-[24px] font-extrabold">Password reset</h1>
          <p className="max-w-xs text-[13.5px] text-ink-muted">
            Your old recovery code no longer works — here's your new one. Save it somewhere safe.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-[22px] bg-surface p-5">
          <span className="font-mono text-[22px] font-bold tracking-wide text-ink">{nextCode}</span>
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
      <Link to="/login" className="inline-flex size-9 items-center justify-center rounded-full bg-accent-tint text-accent" aria-label="Back">
        <ChevronLeftIcon size={16} />
      </Link>

      <div>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight">Reset password</h1>
        <p className="mt-1 text-[13.5px] text-ink-muted">
          Enter the recovery code you saved at signup. No code? Whoever runs this app can reset your account manually.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <TextField id="username" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        <TextField
          id="recoveryCode"
          label="Recovery code"
          value={recoveryCode}
          onChange={(e) => setRecoveryCode(e.target.value)}
          placeholder="XXXX-XXXX-XXXX"
          autoCapitalize="characters"
          required
        />
        <TextField
          id="newPassword"
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />

        {error && <p className="text-[13px] font-medium text-danger">{error}</p>}

        <button type="submit" disabled={submitting} className="mt-1 w-full rounded-full bg-accent py-3 font-semibold text-white disabled:opacity-60">
          {submitting ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </main>
  )
}
