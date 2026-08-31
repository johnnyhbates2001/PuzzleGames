import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { AppLink as Link } from '../components/AppLink'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import type { Difficulty, PatchesLevelRecord } from '../engine/patches/types'
import type { PlacedRect } from '../engine/patches/validator'
import { averageTimeMs, getPatchesProgress } from '../storage/db'
import { PatchesBoard } from '../components/PatchesBoard'
import { CompleteSheet } from '../components/CompleteSheet'

interface CompleteLocationState {
  timeMs: number
  levelNumber?: number
  level: PatchesLevelRecord
  placed: PlacedRect[]
  coinsAwarded: number
  isPersonalBest?: boolean
  dailyBonusApplied?: boolean
  dailyStreak?: number
}

const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

export default function PatchesCompletePage() {
  const { difficulty } = useParams<{ difficulty: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [avgMs, setAvgMs] = useState<number | null>(null)
  const [bestMs, setBestMs] = useState<number | null>(null)

  const isDaily = difficulty === 'daily'
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const completion = location.state as CompleteLocationState | null

  useEffect(() => {
    if (!validDifficulty) return
    let cancelled = false
    getPatchesProgress(validDifficulty).then((progress) => {
      if (!cancelled) {
        setAvgMs(averageTimeMs(progress))
        setBestMs(progress.bestTimeMs)
      }
    })
    return () => {
      cancelled = true
    }
  }, [validDifficulty])

  if ((!validDifficulty && !isDaily) || !completion) {
    return (
      <main
        data-game="patches"
        className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-bg px-4 text-center text-ink"
      >
        <p>No completion to show.</p>
        <Link to="/patches" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
          Back to difficulties
        </Link>
      </main>
    )
  }

  const { timeMs, levelNumber, level, placed, coinsAwarded, isPersonalBest, dailyBonusApplied, dailyStreak } = completion

  return (
    <main data-game="patches" className="fixed inset-0 overflow-hidden bg-bg">
      <CompleteSheet
        boardPreview={
          <PatchesBoard
            level={level}
            placed={placed}
            dragAnchor={null}
            dragEnd={null}
            onStartDrag={() => {}}
            onDragMove={() => {}}
            onCommitDrag={() => {}}
            onCancelDrag={() => {}}
            onRemoveRect={() => {}}
            className="pointer-events-none absolute inset-x-4 top-[max(1.5rem,env(safe-area-inset-top))] max-w-lg opacity-65 blur-[3px] sm:mx-auto sm:inset-x-0"
          />
        }
        difficultyLabel={isDaily ? 'Daily Challenge' : LABELS[validDifficulty as Difficulty]}
        levelNumber={isDaily ? undefined : levelNumber}
        timeMs={timeMs}
        bestMs={bestMs}
        avgMs={avgMs}
        coinsAwarded={coinsAwarded}
        isPersonalBest={!!isPersonalBest}
        dailyBonusApplied={dailyBonusApplied}
        isDaily={isDaily}
        dailyStreak={dailyStreak}
        chaptersHref="/patches/chapters"
        onNextLevel={() => navigate(`/patches/${validDifficulty}`, { replace: true })}
        onReplay={() =>
          navigate(isDaily ? '/patches/daily' : `/patches/${validDifficulty}`, { state: { replayLevel: level }, replace: true })
        }
      />
    </main>
  )
}
