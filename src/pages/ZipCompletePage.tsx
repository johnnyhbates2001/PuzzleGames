import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Coord, Difficulty, ZipLevelRecord } from '../engine/zip/types'
import { averageTimeMs, getZipProgress } from '../storage/db'
import { ZipBoard } from '../components/ZipBoard'
import { CompleteSheet } from '../components/CompleteSheet'

interface CompleteLocationState {
  timeMs: number
  levelNumber: number
  level: ZipLevelRecord
  path: Coord[]
  coinsAwarded: number
  isPersonalBest: boolean
}

const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

export default function ZipCompletePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [avgMs, setAvgMs] = useState<number | null>(null)
  const [bestMs, setBestMs] = useState<number | null>(null)

  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const completion = location.state as CompleteLocationState | null

  useEffect(() => {
    if (!validDifficulty) return
    let cancelled = false
    getZipProgress(validDifficulty).then((progress) => {
      if (!cancelled) {
        setAvgMs(averageTimeMs(progress))
        setBestMs(progress.bestTimeMs)
      }
    })
    return () => {
      cancelled = true
    }
  }, [validDifficulty])

  if (!validDifficulty || !completion) {
    return (
      <main
        data-game="zip"
        className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-bg px-4 text-center text-ink"
      >
        <p>No completion to show.</p>
        <Link to="/zip" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
          Back to difficulties
        </Link>
      </main>
    )
  }

  const { timeMs, levelNumber, level, path, coinsAwarded, isPersonalBest } = completion

  return (
    <main data-game="zip" className="fixed inset-0 overflow-hidden bg-bg">
      <CompleteSheet
        boardPreview={
          <ZipBoard
            level={level}
            path={path}
            onCellEnter={() => {}}
            className="pointer-events-none absolute inset-x-4 top-[max(1.5rem,env(safe-area-inset-top))] max-w-lg opacity-65 blur-[3px] sm:mx-auto sm:inset-x-0"
          />
        }
        difficultyLabel={LABELS[validDifficulty]}
        levelNumber={levelNumber}
        timeMs={timeMs}
        bestMs={bestMs}
        avgMs={avgMs}
        coinsAwarded={coinsAwarded}
        isPersonalBest={isPersonalBest}
        onNextLevel={() => navigate(`/zip/${validDifficulty}`, { replace: true })}
        onReplay={() => navigate(`/zip/${validDifficulty}`, { state: { replayLevel: level }, replace: true })}
      />
    </main>
  )
}
