export type SoundName = 'tap' | 'error' | 'success' | 'coin' | 'hint'

let ctx: AudioContext | null = null

/** Lazily created — an AudioContext must be constructed (or resumed) from inside a user
 *  gesture on most browsers, and every call site here is already inside a click handler. */
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** One short tone with a quick attack/decay envelope so notes don't click at the edges. */
function beep(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.12, startAt = 0): void {
  const audioCtx = getContext()
  if (!audioCtx) return
  const t0 = audioCtx.currentTime + startAt
  const osc = audioCtx.createOscillator()
  const env = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  env.gain.setValueAtTime(0, t0)
  env.gain.linearRampToValueAtTime(gain, t0 + 0.008)
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000)
  osc.connect(env)
  env.connect(audioCtx.destination)
  osc.start(t0)
  osc.stop(t0 + durationMs / 1000 + 0.02)
}

const SOUNDS: Record<SoundName, () => void> = {
  tap: () => beep(720, 30, 'sine', 0.05),
  error: () => beep(140, 140, 'sawtooth', 0.07),
  success: () => {
    beep(523, 110, 'triangle', 0.09, 0)
    beep(659, 110, 'triangle', 0.09, 0.09)
    beep(880, 180, 'triangle', 0.1, 0.18)
  },
  coin: () => {
    beep(988, 70, 'square', 0.06, 0)
    beep(1318, 110, 'square', 0.07, 0.06)
  },
  hint: () => {
    beep(440, 80, 'sine', 0.07, 0)
    beep(587, 100, 'sine', 0.07, 0.07)
  },
}

export function playRawSound(name: SoundName): void {
  SOUNDS[name]()
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(pattern)
}
