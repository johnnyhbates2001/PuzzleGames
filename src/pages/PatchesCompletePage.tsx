import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { AppLink as Link } from '../components/AppLink'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import type { Difficulty, PatchesLevelRecord } from '../engine/patches/types'
import type { PlacedRect } from '../engine/patches/validator'
import { getPatchesProgress, getStreak } from '../storage/db'
import { PatchesBoard } from '../components/PatchesBoard'
import { CompleteSheet } from '../components/CompleteSheet'
import type { ChapterCompleteInfo } from '../hooks/useGameCompletion'

interface ChapterReplayState {
  chapterNumber: number
  chapterName: string
  levels: PatchesLevelRecord[]
  index: number
}

interface CompleteLocationState {
  timeMs: number
  levelNumber?: number
  level: PatchesLevelRecord
  placed: PlacedRect[]
  coinsAwarded: number
  isPersonalBest?: boolean
  dailyBonusApplied?: boolean
  dailyStreak?: number
  chapterComplete?: ChapterCompleteInfo
  chapterReplay?: ChapterReplayState
  sessionDone?: boolean
}

const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

export default function PatchesCompletePage({ freePlay = false }: { freePlay?: boolean }) {
  const { difficulty } = useParams<{ difficulty: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [bestMs, setBestMs] = useState<number | null>(null)
  const [streak, setStreak] = useState<number | undefined>(undefined)

  const isDaily = difficulty === 'daily'
  const validDifficulty = isValidDifficulty(difficulty) ? difficulty : null
  const completion = location.state as CompleteLocationState | null
  const isChapterReplay = !!completion?.chapterReplay

  useEffect(() => {
    if (!validDifficulty || freePlay || isChapterReplay) return
    let cancelled = false
    getPatchesProgress(validDifficulty).then((progress) => {
      if (!cancelled) setBestMs(progress.bestTimeMs)
    })
    return () => {
      cancelled = true
    }
  }, [validDifficulty, freePlay, isChapterReplay])

  useEffect(() => {
    if (isDaily) return
    let cancelled = false
    getStreak().then((s) => {
      if (!cancelled) setStreak(s)
    })
    return () => {
      cancelled = true
    }
  }, [isDaily])

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

  const {
    timeMs,
    levelNumber,
    level,
    placed,
    coinsAwarded,
    isPersonalBest,
    dailyBonusApplied,
    dailyStreak,
    chapterComplete,
    chapterReplay,
    sessionDone,
  } = completion

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
        streak={streak}
        coinsAwarded={coinsAwarded}
        isPersonalBest={!!isPersonalBest}
        dailyBonusApplied={dailyBonusApplied}
        isDaily={isDaily}
        dailyStreak={dailyStreak}
        chapterComplete={chapterComplete}
        chapterReplay={chapterReplay && { ...chapterReplay, sessionFinished: !!sessionDone }}
        chaptersHref={isDaily ? '/' : freePlay ? '/patches/chapters?tab=free' : '/patches/chapters'}
        chaptersLabel={isDaily ? 'Back to Home' : freePlay ? 'Back to Free Play' : undefined}
        onNextLevel={() => {
          if (chapterReplay && !sessionDone) {
            navigate(`/patches/${validDifficulty}`, { state: { chapterReplay }, replace: true })
            return
          }
          if (chapterReplay && sessionDone) {
            navigate('/patches/chapters', { replace: true })
            return
          }
          navigate(`/patches/${freePlay ? 'free/' : ''}${validDifficulty}`, { replace: true })
        }}
        onReplay={() => {
          if (chapterReplay) {
            navigate(`/patches/${validDifficulty}`, {
              state: { chapterReplay: { ...chapterReplay, index: chapterReplay.index - 1 } },
              replace: true,
            })
            return
          }
          navigate(isDaily ? '/patches/daily' : `/patches/${freePlay ? 'free/' : ''}${validDifficulty}`, {
            state: { replayLevel: level },
            replace: true,
          })
        }}
      />
    </main>
  )
}
