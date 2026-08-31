import type { Difficulty } from '../engine/types'
import { CHAPTER_META, LEVELS_PER_CHAPTER, chapterForIndex, endlessProgress } from '../games/chapters'

interface LevelContextProps {
  difficulty: Difficulty
  currentLevelIndex: number
}

/** The "Chapter 3 · Garden Path · 7/20" row shown under GameHeader during a story or
 *  Endless run — absent for Daily/replay runs, which never have a currentLevelIndex to
 *  derive this from (see each Game*Page.tsx's init effect). */
export function LevelContext({ difficulty, currentLevelIndex }: LevelContextProps) {
  const endless = difficulty === 'hard' ? endlessProgress(currentLevelIndex) : null

  if (endless) {
    return (
      <p className="text-[12px] font-semibold text-accent">Endless · Chapter {endless.endlessChapter}</p>
    )
  }

  const { chapterNumber, levelInChapter } = chapterForIndex(currentLevelIndex, difficulty)
  const name = CHAPTER_META[chapterNumber - 1]?.name

  return (
    <div className="flex items-center gap-2.5">
      <p className="shrink-0 text-[12px] font-semibold text-accent">
        Chapter {chapterNumber} · {name}
      </p>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-accent-tint">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${(levelInChapter / LEVELS_PER_CHAPTER) * 100}%` }}
        />
      </div>
      <span className="shrink-0 font-mono text-[11px] font-bold text-ink-muted">
        {levelInChapter + 1}/{LEVELS_PER_CHAPTER}
      </span>
    </div>
  )
}
