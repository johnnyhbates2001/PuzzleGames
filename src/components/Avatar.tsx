import type { CSSProperties } from 'react'
import { getAvatarPreset } from '../avatars'

interface AvatarProps {
  username: string
  avatarType?: string
  avatarValue?: string
  size?: number
}

/** Falls back to an initials circle when avatar info isn't available (or hasn't
 *  loaded yet) — every call site can pass just `username` and still render something
 *  reasonable. Presets only (src/avatars.ts) — no custom image upload, since that
 *  would need R2 storage. */
export function Avatar({ username, avatarType, avatarValue, size = 36 }: AvatarProps) {
  const style: CSSProperties = { width: size, height: size, fontSize: size * 0.5 }
  const preset = avatarType === 'preset' ? getAvatarPreset(avatarValue ?? '') : undefined

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-accent ${preset ? '' : 'bg-accent-tint'}`}
      style={{ ...style, backgroundColor: preset?.bg }}
    >
      {preset ? preset.emoji : username.slice(0, 1).toUpperCase()}
    </span>
  )
}
