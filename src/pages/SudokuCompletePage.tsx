import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Difficulty, SudokuLevelRecord } from '../engine/sudoku/types'
import type { SudokuCellState } from '../state/sudokuTypes'
import { averageTimeMs, getSudokuProgress } from '../storage/db'
import { SudokuBoard } from '../components/SudokuBoard'
import { CompleteSheet } from '../components/CompleteSheet'

interface CompleteLocationState {
  timeMs: number
  levelNumber?: number
  level: SudokuLevelRecord
  board: SudokuCellState[][]
  coinsAwarded: number
  isPersonalBest?: boolean
  dailyBonusApplied?: boolean
  dailyStreak?: number
}

const LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

function isValidDifficulty(value: string | undefined): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

export default function SudokuCompletePage() {
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
    getSudokuProgress(validDifficulty).then((progress) => {
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
        data-game="sudoku"
        className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-4 bg-bg px-4 text-center text-ink"
      >
        <p>No completion to show.</p>
        <Link to="/sudoku" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
          Back to difficulties
        </Link>
      </main>
    )
  }

  const { timeMs, levelNumber, level, board, coinsAwarded, isPersonalBest, dailyBonusApplied, dailyStreak } = completion

  return (
    <main data-game="sudoku" className="fixed inset-0 overflow-hidden bg-bg">
      <CompleteSheet
        boardPreview={
          <SudokuBoard
            board={board}
            selected={null}
            conflicts={new Set()}
            onCellClick={() => {}}
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
        onNextLevel={() => navigate(`/sudoku/${validDifficulty}`, { replace: true })}
        onReplay={() =>
          navigate(isDaily ? '/sudoku/daily' : `/sudoku/${validDifficulty}`, { state: { replayLevel: level }, replace: true })
        }
      />
    </main>
  )
}
