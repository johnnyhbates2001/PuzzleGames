import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { AppLink as Link } from '../components/AppLink'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import type { Difficulty, LevelRecord } from '../engine/types'
import type { CellState } from '../state/types'
import { averageTimeMs, getProgress } from '../storage/db'
import { Board } from '../components/Board'
import { CompleteSheet } from '../components/CompleteSheet'
import type { ChapterCompleteInfo } from '../hooks/useGameCompletion'

interface CompleteLocationState {
  timeMs: number
  levelNumber?: number
  level: LevelRecord
  board: CellState[][]
  coinsAwarded: number
  isPersonalBest?: boolean
  dailyBonusApplied?: boolean
  dailyStreak?: number
  chapterComplete?: ChapterCompleteInfo
}

const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

export default function CompletePage({ freePlay = false }: { freePlay?: boolean }) {
  const { difficulty } = useParams<{ difficulty: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [avgMs, setAvgMs] = useState<number | null>(null)
  const [bestMs, setBestMs] = useState<number | null>(null)

  const isDaily = difficulty === 'daily'
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const completion = location.state as CompleteLocationState | null

  // Free Play never writes a *Progress record (see storage/db.ts's
  // recordFreePlayCompletion), so there's no Best/Average to fetch — CompleteSheet
  // hides that tile outright when freePlay is set.
  useEffect(() => {
    if (!validDifficulty || freePlay) return
    let cancelled = false
    getProgress(validDifficulty).then((progress) => {
      if (!cancelled) {
        setAvgMs(averageTimeMs(progress))
        setBestMs(progress.bestTimeMs)
      }
    })
    return () => {
      cancelled = true
    }
  }, [validDifficulty, freePlay])

  if ((!validDifficulty && !isDaily) || !completion) {
    return (
      <main
        data-game="queens"
        className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-bg px-4 text-center text-ink"
      >
        <p>No completion to show.</p>
        <Link to="/queens" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
          Back to difficulties
        </Link>
      </main>
    )
  }

  const { timeMs, levelNumber, level, board, coinsAwarded, isPersonalBest, dailyBonusApplied, dailyStreak, chapterComplete } =
    completion

  return (
    <main data-game="queens" className="fixed inset-0 overflow-hidden bg-bg">
      <CompleteSheet
        boardPreview={
          <Board
            level={level}
            board={board}
            conflicts={new Set()}
            onCellClick={() => {}}
            onDragStart={() => {}}
            onCellDragEnter={() => {}}
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
        chapterComplete={chapterComplete}
        freePlay={freePlay}
        chaptersHref={isDaily ? '/' : freePlay ? '/queens/chapters?tab=free' : '/queens/chapters'}
        chaptersLabel={isDaily ? 'Back to Home' : freePlay ? 'Back to Free Play' : undefined}
        onNextLevel={() => navigate(`/queens/${freePlay ? 'free/' : ''}${validDifficulty}`, { replace: true })}
        onReplay={() =>
          navigate(isDaily ? '/queens/daily' : `/queens/${freePlay ? 'free/' : ''}${validDifficulty}`, {
            state: { replayLevel: level },
            replace: true,
          })
        }
      />
    </main>
  )
}
