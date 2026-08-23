import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Difficulty, ZipLevelRecord } from '../engine/zip/types'
import { createInitialState, getWrongCells, zipReducer } from '../state/zipReducer'
import { getSettings, getZipInProgress, recordZipCompletion, saveZipInProgress, spendCoins } from '../storage/db'
import { getNextZipLevel } from '../games/zipLevels'
import { useAppLifecycle } from '../hooks/useAppLifecycle'
import { ZipBoard } from '../components/ZipBoard'
import { ZipControls } from '../components/ZipControls'
import { GameHeader } from '../components/GameHeader'
import { HintSheet, type HintOption } from '../components/HintSheet'

const HINT_OPTIONS: HintOption[] = [
  { id: 'reveal-next', icon: '👁', title: 'Reveal next step', desc: 'Extends your path by one correct cell.', price: 25 },
  { id: 'check', icon: '⚑', title: 'Check my work', desc: 'Flags any step that strayed from the path.', price: 40 },
]

// Content doesn't matter — this state is replaced by LOAD before the player can
// interact, and (unlike Sudoku) Zip's engine is fully parameterized by level.size, so
// a trivial 1x1 placeholder is safe.
const PLACEHOLDER_LEVEL: ZipLevelRecord = {
  id: 'placeholder',
  difficulty: 'easy',
  size: 1,
  checkpoints: [{ row: 0, col: 0 }],
  walls: [],
  solution: [{ row: 0, col: 0 }],
}

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

interface ReplayLocationState {
  replayLevel?: ZipLevelRecord
}

export default function ZipGamePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null

  const [state, dispatch] = useReducer(zipReducer, PLACEHOLDER_LEVEL, (level) => createInitialState(level))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coins, setCoins] = useState(0)
  const [hintsOpen, setHintsOpen] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)
  const sourceRef = useRef<{ source: 'bank' | 'generated'; bankIndex?: number }>({ source: 'generated' })
  const initialReplayLevelRef = useRef((location.state as ReplayLocationState | null)?.replayLevel)

  useEffect(() => {
    if (!validDifficulty) return
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)
      try {
        const replayLevel = initialReplayLevelRef.current
        if (replayLevel) {
          getSettings().then((s) => !cancelled && setCoins(s.coins))
          dispatch({ type: 'LOAD', level: replayLevel })
          return
        }

        const [settings, inProgress] = await Promise.all([getSettings(), getZipInProgress(validDifficulty as Difficulty)])
        if (cancelled) return
        setCoins(settings.coins)

        if (inProgress) {
          sourceRef.current = { source: inProgress.levelSource, bankIndex: inProgress.bankIndex }
          dispatch({
            type: 'LOAD',
            level: inProgress.level,
            snapshot: { path: inProgress.path, elapsedMs: inProgress.elapsedMs },
          })
        } else {
          const next = await getNextZipLevel(validDifficulty as Difficulty)
          if (cancelled) return
          sourceRef.current = { source: next.source, bankIndex: next.bankIndex }
          dispatch({ type: 'LOAD', level: next.level })
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [validDifficulty])

  useEffect(() => {
    if (!loading && !error && state.status === 'playing') {
      dispatch({ type: 'RESUME', now: Date.now() })
    }
  }, [loading, error])

  useAppLifecycle(
    () => dispatch({ type: 'PAUSE', now: Date.now() }),
    () => {
      if (state.status === 'playing') dispatch({ type: 'RESUME', now: Date.now() })
    },
  )

  useEffect(() => {
    if (loading || !validDifficulty || state.status !== 'playing') return
    saveZipInProgress({
      difficulty: validDifficulty as Difficulty,
      level: state.level,
      levelSource: sourceRef.current.source,
      bankIndex: sourceRef.current.bankIndex,
      path: state.path,
      elapsedMs: state.elapsedMs,
      savedAt: Date.now(),
    })
  }, [state.path, state.elapsedMs, state.level, state.status, loading, validDifficulty])

  useEffect(() => {
    if (state.status !== 'won' || !validDifficulty) return
    let cancelled = false
    recordZipCompletion(validDifficulty as Difficulty, state.elapsedMs, state.hintsUsed > 0).then((result) => {
      if (!cancelled) {
        navigate(`/zip/${validDifficulty}/complete`, {
          state: {
            timeMs: state.elapsedMs,
            levelNumber: result.progress.completedCount,
            level: state.level,
            path: state.path,
            coinsAwarded: result.coinsAwarded,
            isPersonalBest: result.isPersonalBest,
          },
          replace: true,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [state.status, validDifficulty, navigate, state.elapsedMs, state.level, state.path])

  const handleCellEnter = useCallback((row: number, col: number) => {
    dispatch({ type: 'ENTER_CELL', row, col, now: Date.now() })
  }, [])

  const handleUseHint = useCallback(
    async (id: string, price: number) => {
      const ok = await spendCoins(price)
      if (!ok) return
      setCoins((c) => c - price)

      if (id === 'check') {
        const wrong = getWrongCells(state)
        setCheckMessage(wrong.size === 0 ? 'Looking good — nothing wrong yet!' : `${wrong.size} step${wrong.size === 1 ? '' : 's'} strayed from the path.`)
        dispatch({ type: 'HINT_CHECK' })
        return
      }

      setCheckMessage(null)
      if (id === 'reveal-next') dispatch({ type: 'HINT_REVEAL_NEXT', now: Date.now() })
      setHintsOpen(false)
    },
    [state],
  )

  if (!validDifficulty) {
    return <ErrorScreen message="Unknown difficulty." onBack={() => navigate('/zip')} />
  }
  if (error) {
    return <ErrorScreen message={error} onBack={() => navigate('/zip')} />
  }

  return (
    <main
      data-game="zip"
      className="mx-auto flex min-h-svh max-w-lg flex-col items-center gap-6 bg-bg px-4 py-[max(1.5rem,env(safe-area-inset-top))] text-ink"
    >
      <GameHeader backTo="/zip" elapsedMs={state.elapsedMs} runStartedAt={state.runStartedAt} coins={coins} />

      <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
        {loading ? (
          <p className="text-ink-muted">Loading level…</p>
        ) : (
          <ZipBoard level={state.level} path={state.path} onCellEnter={handleCellEnter} />
        )}

        <ZipControls
          canUndo={state.history.length > 0}
          canClear={state.path.length > 0}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onClear={() => dispatch({ type: 'CLEAR', now: Date.now() })}
          onOpenHints={() => {
            setCheckMessage(null)
            setHintsOpen(true)
          }}
          hintPrice={HINT_OPTIONS[0].price}
        />
      </div>

      <HintSheet
        open={hintsOpen}
        onClose={() => setHintsOpen(false)}
        options={HINT_OPTIONS}
        coins={coins}
        onUseHint={handleUseHint}
        checkMessage={checkMessage}
      />
    </main>
  )
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-bg px-4 text-center text-ink">
      <p>{message}</p>
      <button type="button" onClick={onBack} className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
        Back
      </button>
    </main>
  )
}
