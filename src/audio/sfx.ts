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

/** Every id here is one of cosmetics.ts's 'soundPack' category ids, plus 'classic' —
 *  that category's implicit (not separately listed) pre-expansion default. */
export type SoundPackId = 'classic' | 'retro-8bit' | 'chimes' | 'unstoppable-beat' | 'flawless-hush'

type SoundSet = Record<SoundName, () => void>

const CLASSIC: SoundSet = {
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

// Chiptune blips — square waves, punchier and higher-pitched than Classic.
const RETRO_8BIT: SoundSet = {
  tap: () => beep(880, 22, 'square', 0.05),
  error: () => beep(110, 150, 'square', 0.08),
  success: () => {
    beep(660, 60, 'square', 0.08, 0)
    beep(880, 60, 'square', 0.08, 0.06)
    beep(1320, 120, 'square', 0.09, 0.12)
  },
  coin: () => {
    beep(1200, 45, 'square', 0.07, 0)
    beep(1600, 80, 'square', 0.07, 0.05)
  },
  hint: () => {
    beep(500, 55, 'square', 0.07, 0)
    beep(700, 75, 'square', 0.07, 0.06)
  },
}

// Soft bell tones — sine waves with a longer, gentler decay than Classic.
const CHIMES: SoundSet = {
  tap: () => beep(1046, 130, 'sine', 0.045),
  error: () => beep(300, 220, 'triangle', 0.05),
  success: () => {
    beep(784, 220, 'sine', 0.07, 0)
    beep(988, 220, 'sine', 0.07, 0.15)
    beep(1318, 320, 'sine', 0.08, 0.3)
  },
  coin: () => {
    beep(1568, 160, 'sine', 0.05, 0)
    beep(2093, 220, 'sine', 0.05, 0.1)
  },
  hint: () => {
    beep(659, 150, 'sine', 0.05, 0)
    beep(880, 180, 'sine', 0.05, 0.12)
  },
}

// Locked · Unstoppable — low, punchy square-wave hits, drum-like rather than melodic.
const UNSTOPPABLE_BEAT: SoundSet = {
  tap: () => beep(200, 35, 'square', 0.09),
  error: () => beep(90, 170, 'sawtooth', 0.1),
  success: () => {
    beep(150, 90, 'square', 0.14, 0)
    beep(200, 90, 'square', 0.14, 0.09)
    beep(260, 150, 'square', 0.15, 0.18)
  },
  coin: () => {
    beep(300, 55, 'square', 0.1, 0)
    beep(400, 90, 'square', 0.11, 0.06)
  },
  hint: () => {
    beep(220, 65, 'square', 0.09, 0)
    beep(300, 90, 'square', 0.09, 0.07)
  },
}

// Locked · Flawless — everything at a fraction of Classic's gain, near-silent.
const FLAWLESS_HUSH: SoundSet = {
  tap: () => beep(720, 18, 'sine', 0.014),
  error: () => beep(140, 90, 'sine', 0.02),
  success: () => {
    beep(523, 80, 'sine', 0.03, 0)
    beep(659, 80, 'sine', 0.03, 0.08)
    beep(880, 120, 'sine', 0.035, 0.16)
  },
  coin: () => {
    beep(988, 40, 'sine', 0.02, 0)
    beep(1318, 60, 'sine', 0.02, 0.05)
  },
  hint: () => {
    beep(440, 45, 'sine', 0.024, 0)
    beep(587, 60, 'sine', 0.024, 0.06)
  },
}

const SOUND_PACKS: Record<SoundPackId, SoundSet> = {
  classic: CLASSIC,
  'retro-8bit': RETRO_8BIT,
  chimes: CHIMES,
  'unstoppable-beat': UNSTOPPABLE_BEAT,
  'flawless-hush': FLAWLESS_HUSH,
}

export function playRawSound(name: SoundName, pack: SoundPackId = 'classic'): void {
  ;(SOUND_PACKS[pack] ?? CLASSIC)[name]()
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(pattern)
}
