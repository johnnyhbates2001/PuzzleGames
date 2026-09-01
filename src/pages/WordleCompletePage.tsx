import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { AppLink as Link } from '../components/AppLink'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import type { Difficulty, WordleLevelRecord } from '../engine/wordle/types'
import type { SubmittedGuess } from '../engine/wordle/validator'
import { getStreak, getWordleProgress } from '../storage/db'
import { WordleBoard } from '../components/WordleBoard'
import { CompleteSheet } from '../components/CompleteSheet'
import type { ChapterCompleteInfo } from '../hooks/useGameCompletion'

interface ChapterReplayState {
  chapterNumber: number
  chapterName: string
  levels: WordleLevelRecord[]
  index: number
}

interface CompleteLocationState {
  timeMs: number
  levelNumber?: number
  level: WordleLevelRecord
  guesses: SubmittedGuess[]
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

export default function WordleCompletePage({ freePlay = false }: { freePlay?: boolean }) {
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
    getWordleProgress(validDifficulty).then((progress) => {
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
        data-game="wordle"
        className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-bg px-4 text-center text-ink"
      >
        <p>No completion to show.</p>
        <Link to="/wordle" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
          Back to difficulties
        </Link>
      </main>
    )
  }

  const {
    timeMs,
    levelNumber,
    level,
    guesses,
    coinsAwarded,
    isPersonalBest,
    dailyBonusApplied,
    dailyStreak,
    chapterComplete,
    chapterReplay,
    sessionDone,
  } = completion

  return (
    <main data-game="wordle" className="fixed inset-0 overflow-hidden bg-bg">
      <CompleteSheet
        boardPreview={
          <WordleBoard
            attempts={guesses.length}
            guesses={guesses}
            currentGuess=""
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
        chaptersHref={isDaily ? '/' : freePlay ? '/wordle/chapters?tab=free' : '/wordle/chapters'}
        chaptersLabel={isDaily ? 'Back to Home' : freePlay ? 'Back to Free Play' : undefined}
        onNextLevel={() => {
          if (chapterReplay && !sessionDone) {
            navigate(`/wordle/${validDifficulty}`, { state: { chapterReplay }, replace: true })
            return
          }
          if (chapterReplay && sessionDone) {
            navigate('/wordle/chapters', { replace: true })
            return
          }
          navigate(`/wordle/${freePlay ? 'free/' : ''}${validDifficulty}`, { replace: true })
        }}
        onReplay={() => {
          if (chapterReplay) {
            navigate(`/wordle/${validDifficulty}`, {
              state: { chapterReplay: { ...chapterReplay, index: chapterReplay.index - 1 } },
              replace: true,
            })
            return
          }
          navigate(isDaily ? '/wordle/daily' : `/wordle/${freePlay ? 'free/' : ''}${validDifficulty}`, {
            state: { replayLevel: level },
            replace: true,
          })
        }}
      />
    </main>
  )
}
