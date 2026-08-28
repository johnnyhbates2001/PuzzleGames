import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

// Rotates so it doesn't go stale from being seen every cold launch — see App.tsx for
// the sessionStorage gate that keeps this to once per app open.
const NOTES = [
  'Volim te dušo 🍷',
  'Za moju najdražu 📚',
  'Napravljeno s ljubavlju',
  'Zagonetke i vino te čekaju 🍷',
  'Srce moje 🎨',
  'Vrijeme za igru, ljubavi',
]

const VISIBLE_MS = 1800
const FADE_MS = 420

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [note] = useState(() => NOTES[Math.floor(Math.random() * NOTES.length)])
  const [fading, setFading] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (fading) {
      const t = setTimeout(onDone, reducedMotion ? 0 : FADE_MS)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setFading(true), VISIBLE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fading])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setFading(true)}
      className={`fixed inset-0 z-100 flex items-center justify-center bg-[linear-gradient(160deg,#3D0F1F_0%,#7B1E3D_55%,#C9A227_130%)] transition-opacity ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: reducedMotion ? '0ms' : `${FADE_MS}ms` }}
    >
      <p className="anim-pop-in px-10 text-center font-display text-[26px] font-extrabold text-white [text-shadow:0_2px_16px_rgb(0_0_0_/_0.3)]">
        {note}
      </p>
    </div>
  )
}
