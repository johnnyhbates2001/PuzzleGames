import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

/** Shared text-input style for the account/auth pages — the first place this app
 *  has needed a text input at all (everything else is tap-driven). */
export function TextField({ label, id, ...props }: TextFieldProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink-muted">{label}</span>
      <input
        id={id}
        {...props}
        className="rounded-2xl bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-muted/70 focus:ring-2 focus:ring-accent"
      />
    </label>
  )
}
