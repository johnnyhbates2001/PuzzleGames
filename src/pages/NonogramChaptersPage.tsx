import { useEffect, useMemo, useState } from 'react'
import { AppLink as Link } from '../components/AppLink'
import type { Difficulty } from '../engine/nonogram/types'
import { getNonogramProgress, type DifficultyProgress } from '../storage/db'
import { buildChapterNodes, type ChapterNodeState } from '../games/chapters'
import { useAutoOpenRulesOnce } from '../hooks/useAutoOpenRulesOnce'
import { RulesButton, RulesSheet } from '../components/RulesSheet'
import { EndlessCard } from '../components/EndlessCard'
import { GAME_RULES } from '../games/rules'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const TIER_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export default function NonogramChaptersPage() {
  const [progress, setProgress] = useState<Partial<Record<Difficulty, DifficultyProgress>>>({})
  const [rulesOpen, setRulesOpen] = useState(false)
  useAutoOpenRulesOnce('nonogram', setRulesOpen)

  useEffect(() => {
    let cancelled = false
    Promise.all(DIFFICULTIES.map((d) => getNonogramProgress(d))).then((results) => {
      if (cancelled) return
      const map: Partial<Record<Difficulty, DifficultyProgress>> = {}
      DIFFICULTIES.forEach((d, i) => {
        map[d] = results[i]
      })
      setProgress(map)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const nodes = useMemo(() => {
    if (!progress.easy || !progress.medium || !progress.hard) return null
    return buildChapterNodes({
      easy: progress.easy.currentLevelIndex,
      medium: progress.medium.currentLevelIndex,
      hard: progress.hard.currentLevelIndex,
    })
  }, [progress])

  return (
    <main
      data-game="nonogram"
      className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-12 text-ink"
    >
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex size-9 items-center justify-center rounded-full bg-accent-tint text-accent"
          aria-label="Home"
        >
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
            <path d="M8 1L1 7.5 8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <RulesButton onClick={() => setRulesOpen(true)} />
      </div>
      <div>
        <h1 className="font-display text-[28px] font-extrabold">Nonogram</h1>
        <Link to="/nonogram" className="mt-1 inline-block text-[13px] font-semibold text-accent">
          Free play instead →
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        {DIFFICULTIES.map((tier) => (
          <div key={tier} className="flex flex-col gap-2">
            <h2 className="px-1 text-[13px] font-bold tracking-wide text-ink-muted uppercase">{TIER_LABEL[tier]}</h2>
            <div className="flex flex-col gap-2">
              {nodes?.filter((n) => n.difficulty === tier).map((node) => <ChapterRow key={node.chapterNumber} node={node} />)}
            </div>
          </div>
        ))}
        {progress.hard && <EndlessCard hardCurrentLevelIndex={progress.hard.currentLevelIndex} gameRoute="/nonogram" />}
      </div>

      <RulesSheet
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Nonogram"
        steps={GAME_RULES.nonogram.steps}
        tip={GAME_RULES.nonogram.tip}
      />
    </main>
  )
}

function ChapterRow({ node }: { node: ChapterNodeState }) {
  const { chapterNumber, meta, difficulty, status, levelInChapter } = node
  const isNextBoss = status === 'current' && levelInChapter === 19

  const content = (
    <>
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
          status === 'complete'
            ? 'bg-accent text-white'
            : status === 'current'
              ? 'bg-accent-tint text-accent'
              : 'bg-bg text-ink-muted'
        }`}
      >
        {status === 'complete' ? '✓' : chapterNumber}
      </div>
      <div className="flex-1">
        <p className={`text-[15px] font-bold ${status === 'locked' ? 'text-ink-muted' : 'text-ink'}`}>{meta.name}</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {status === 'locked' && 'Locked'}
          {status === 'current' && `Level ${levelInChapter + 1} of 20${isNextBoss ? ' · Boss level' : ''}`}
          {status === 'complete' && (meta.skinId ? 'Complete · skin unlocked' : 'Complete')}
        </p>
      </div>
      {status === 'current' && <span className="shrink-0 text-lg text-ink-muted">›</span>}
    </>
  )

  const rowClass = 'flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card'

  if (status === 'current') {
    return (
      <Link to={`/nonogram/${difficulty}`} className={`${rowClass} transition hover:shadow-md`}>
        {content}
      </Link>
    )
  }
  return <div className={`${rowClass} ${status === 'locked' ? 'opacity-60' : ''}`}>{content}</div>
}
