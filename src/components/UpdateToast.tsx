import { useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useAppLifecycle } from '../hooks/useAppLifecycle'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly, while the app stays open

/**
 * registerType:'prompt' + skipWaiting:false means a new service worker sits
 * "waiting" until the user confirms — it never reloads mid-puzzle. But an installed
 * iOS PWA is typically backgrounded/resumed rather than reloaded, so it may never
 * re-check for a new version on its own. We force a check on an hourly interval and
 * every time the app returns to the foreground.
 */
export function UpdateToast() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      registrationRef.current = registration
      setInterval(() => registration.update(), UPDATE_CHECK_INTERVAL_MS)
    },
  })

  useAppLifecycle(
    () => {},
    () => registrationRef.current?.update(),
  )

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex w-fit items-center gap-3 rounded-full bg-accent px-4 py-2 text-sm text-white shadow-card">
      <span>New version available</span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="rounded-full bg-white px-3 py-1 font-medium text-accent"
      >
        Refresh
      </button>
    </div>
  )
}
