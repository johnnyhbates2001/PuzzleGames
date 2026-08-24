import { useEffect } from 'react'
import { useAppLifecycle } from './useAppLifecycle'

type ResumePauseAction = { type: 'RESUME'; now: number } | { type: 'PAUSE'; now: number }

/** Shared by every Game*Page: resumes the timer once a level finishes loading (LOAD
 *  always leaves it paused), and pauses/resumes it as the tab is hidden/shown.
 *  Deliberately reacts only to loading/error transitions, not every status change —
 *  status also flips (e.g. to 'won') for reasons that must NOT re-fire RESUME. */
export function useGameLifecycle(loading: boolean, error: string | null, status: string, dispatch: (action: ResumePauseAction) => void) {
  useEffect(() => {
    if (!loading && !error && status === 'playing') {
      dispatch({ type: 'RESUME', now: Date.now() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error])

  useAppLifecycle(
    () => dispatch({ type: 'PAUSE', now: Date.now() }),
    () => {
      if (status === 'playing') dispatch({ type: 'RESUME', now: Date.now() })
    },
  )
}
