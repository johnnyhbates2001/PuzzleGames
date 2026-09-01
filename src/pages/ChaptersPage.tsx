import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AppLink as Link } from '../components/AppLink'
import { useAppNavigate as useNavigate } from '../hooks/useAppNavigate'
import type { Difficulty } from '../engine/types'
import type { DifficultyProgress } from '../storage/db'
import {
  buildChapterNodes,
  endlessProgress,
  modifierLabel,
  modifiersForLevel,
  type ChapterNodeState,
  type EndlessProgress,
} from '../games/chapters'
import { useAutoOpenRulesOnce } from '../hooks/useAutoOpenRulesOnce'
import { RulesSheet } from '../components/RulesSheet'
import { GAME_RULES } from '../games/rules'
import { getSkin } from '../skins'
import { GAMES } from '../games/registry'
import { CHAPTER_LEVELS_GETTER, PREVIEW_BY_ID, PROGRESS_GETTER, SIZE_LABEL } from '../games/gamePreviews'
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HelpCircleIcon,
  InfinityIcon,
  LockIcon,
  NoHintsIcon,
  NoUndoIcon,
  PerfectRunIcon,
  TimedIcon,
} from '../components/icons'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const TIER_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const NEXT_TIER: Record<Difficulty, Difficulty | null> = { easy: 'medium', medium: 'hard', hard: null }
const MODIFIER_ICON: Record<string, (props: { size?: number }) => React.JSX.Element> = {
  Timed: TimedIcon,
  'No Undo': NoUndoIcon,
  'No Hints': NoHintsIcon,
  'Perfect Run': PerfectRunIcon,
}

export default function ChaptersPage({ gameId }: { gameId: string }) {
  const game = GAMES.find((g) => g.id === gameId)!
  const { title, route } = game
  const location = useLocation()
  const [progress, setProgress] = useState<Partial<Record<Difficulty, DifficultyProgress>>>({})
  const [rulesOpen, setRulesOpen] = useState(false)
  // Deep-linkable via ?tab=free — FailSheet/BossGateSheet's "back" link from a Free
  // Play run lands here, and a fresh visit still defaults to the chapter trail.
  const [tab, setTab] = useState<'primary' | 'free'>(() =>
    new URLSearchParams(location.search).get('tab') === 'free' ? 'free' : 'primary',
  )
  useAutoOpenRulesOnce(gameId, setRulesOpen)

  useEffect(() => {
    let cancelled = false
    const getter = PROGRESS_GETTER[gameId]
    Promise.all(DIFFICULTIES.map((d) => getter(d))).then((results) => {
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
  }, [gameId])

  const nodes = useMemo(() => {
    if (!progress.easy || !progress.medium || !progress.hard) return null
    return buildChapterNodes({
      easy: progress.easy.currentLevelIndex,
      medium: progress.medium.currentLevelIndex,
      hard: progress.hard.currentLevelIndex,
    })
  }, [progress])

  const endless = progress.hard ? endlessProgress(progress.hard.currentLevelIndex) : null
  const completedChapters = nodes?.filter((n) => n.status === 'complete').length ?? 0

  return (
    <main
      data-game={gameId}
      className="mx-auto flex min-h-svh max-w-lg flex-col gap-5 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-12 text-ink"
    >
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex size-11 items-center justify-center rounded-full bg-accent-tint text-accent"
          aria-label="Home"
        >
          <ChevronLeftIcon />
        </Link>
        <button
          type="button"
          aria-label="How to play"
          onClick={() => setRulesOpen(true)}
          className="inline-flex size-11 items-center justify-center rounded-full bg-accent-tint text-accent"
        >
          <HelpCircleIcon size={20} />
        </button>
      </div>

      <div>
        <h1 className="font-display text-[30px] font-extrabold tracking-tight">{title}</h1>
        <div className="mt-3 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent-tint">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${(completedChapters / 30) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11.5px] font-bold text-ink-muted">{completedChapters} / 30</span>
        </div>
      </div>

      <div className="flex gap-1 rounded-full bg-accent-tint p-1">
        <button
          type="button"
          onClick={() => setTab('primary')}
          className={`h-[38px] flex-1 rounded-full text-[13.5px] font-bold transition ${
            tab === 'primary' ? 'bg-accent text-white' : 'text-accent'
          }`}
        >
          {endless ? 'Endless' : 'Chapters'}
        </button>
        <button
          type="button"
          onClick={() => setTab('free')}
          className={`h-[38px] flex-1 rounded-full text-[13.5px] font-bold transition ${
            tab === 'free' ? 'bg-accent text-white' : 'text-accent'
          }`}
        >
          Free play
        </button>
      </div>

      {tab === 'primary' &&
        (endless ? (
          <EndlessTab route={route} endless={endless} />
        ) : (
          nodes && <ChaptersTrail nodes={nodes} route={route} gameId={gameId} />
        ))}

      {tab === 'free' && <FreePlayTab gameId={gameId} route={route} />}

      <RulesSheet
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title={title}
        steps={GAME_RULES[gameId].steps}
        tip={GAME_RULES[gameId].tip}
        gameId={gameId}
      />
    </main>
  )
}

function ChaptersTrail({ nodes, route, gameId }: { nodes: ChapterNodeState[]; route: string; gameId: string }) {
  const currentIdx = nodes.findIndex((n) => n.status === 'current')
  // Every game starts with chapter 1 already 'current' (see buildChapterNodes), so this
  // only comes back empty once the whole story is done — and that state routes to the
  // Endless tab instead of this trail, so `current` is always defined here.
  const current = nodes[currentIdx]
  const completeNodes = nodes.slice(0, currentIdx)
  const tierRemainder = nodes.slice(currentIdx + 1).filter((n) => n.difficulty === current.difficulty)
  const next1 = tierRemainder[0]
  const rewardNode = tierRemainder.find((n) => n.meta.skinId)
  const shownChapters = new Set([next1?.chapterNumber, rewardNode?.chapterNumber].filter((n): n is number => n != null))
  const collapseCount = tierRemainder.filter((n) => !shownChapters.has(n.chapterNumber)).length
  const nextTier = NEXT_TIER[current.difficulty]

  return (
    <div className="relative flex flex-col gap-2 pt-0.5">
      <div className="absolute top-5 bottom-8 left-[21px] border-l-2 border-dashed border-border-dashed" />

      {completeNodes.map((node) => (
        <CompleteRow key={node.chapterNumber} node={node} route={route} gameId={gameId} />
      ))}

      <CurrentRow node={current} route={route} />

      {next1 && <LockedRow node={next1} />}
      {rewardNode && rewardNode.chapterNumber !== next1?.chapterNumber && <RewardPreviewRow node={rewardNode} />}

      {collapseCount > 0 && (
        <div className="relative flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg text-[17px] font-bold text-ink-muted opacity-50">
            ···
          </span>
          <p className="text-[12.5px] font-semibold text-ink-muted">
            {collapseCount} more chapter{collapseCount === 1 ? '' : 's'} in {TIER_LABEL[current.difficulty]}
            {nextTier ? `, then ${TIER_LABEL[nextTier]}` : ''}
          </p>
        </div>
      )}

      <div className="mt-1 flex items-center gap-3.5 opacity-50">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted">
          <InfinityIcon />
        </span>
        <div className="flex flex-1 items-center rounded-2xl bg-surface p-3.5">
          <div>
            <p className="text-[15px] font-bold text-ink-muted">Endless</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">Unlocks after The Summit</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompleteRow({ node, route, gameId }: { node: ChapterNodeState; route: string; gameId: string }) {
  const navigate = useNavigate()
  const skin = node.meta.skinId ? getSkin(node.meta.skinId) : null
  const [loadingReplay, setLoadingReplay] = useState(false)

  async function handleReplay() {
    if (loadingReplay) return
    setLoadingReplay(true)
    try {
      const levels = await CHAPTER_LEVELS_GETTER[gameId](node.difficulty, node.chapterNumber)
      navigate(`${route}/${node.difficulty}`, {
        state: { chapterReplay: { chapterNumber: node.chapterNumber, chapterName: node.meta.name, levels, index: 0 } },
      })
    } finally {
      setLoadingReplay(false)
    }
  }

  return (
    <div className="relative flex items-center gap-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_0_0_4px_var(--color-bg)]">
        <CheckIcon />
      </span>
      <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface p-3.5 shadow-card">
        <div className="flex-1">
          <p className="text-[14.5px] font-bold text-ink">{node.meta.name}</p>
          {skin && (
            <div className="mt-2 flex items-center gap-2">
              <span className="flex overflow-hidden rounded-[6px] shadow-[0_0_0_1px_var(--color-grid-gap)]">
                {skin.colors.slice(0, 6).map((c, i) => (
                  <span key={i} className="size-[17px]" style={{ backgroundColor: c }} />
                ))}
              </span>
              <span className="text-[11.5px] font-semibold text-accent">{skin.name} skin earned</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleReplay}
          disabled={loadingReplay}
          className="flex h-[38px] shrink-0 items-center rounded-full bg-accent-tint px-4 text-[13.5px] font-bold text-accent disabled:opacity-50"
        >
          Replay
        </button>
      </div>
    </div>
  )
}

function CurrentRow({ node, route }: { node: ChapterNodeState; route: string }) {
  const isBoss = node.levelInChapter === 19
  return (
    <div className="relative flex items-center gap-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-[15px] font-bold text-accent shadow-[0_0_0_4px_var(--color-bg),0_0_0_6px_var(--color-accent)]">
        {node.chapterNumber}
      </span>
      <div className="flex-1 rounded-[18px] bg-surface p-3.5 shadow-[0_8px_22px_-6px_color-mix(in_oklch,var(--color-accent)_40%,transparent)]">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="font-display text-[16px] font-extrabold text-ink">{node.meta.name}</p>
            <p className="mt-1 text-[12px] font-semibold text-accent">
              Level {node.levelInChapter + 1} of 20{isBoss ? ' · Boss level' : ''}
            </p>
          </div>
          <Link
            to={`${route}/${node.difficulty}`}
            className="flex h-[38px] shrink-0 items-center rounded-full bg-accent px-4 text-[13.5px] font-bold text-white"
          >
            Play
          </Link>
        </div>
        <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-accent-tint">
          <div className="h-full rounded-full bg-accent" style={{ width: `${(node.levelInChapter / 20) * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

function LockedRow({ node }: { node: ChapterNodeState }) {
  return (
    <div className="relative flex items-center gap-3.5 opacity-55">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-[15px] font-bold text-ink-muted shadow-[0_0_0_4px_var(--color-bg)]">
        {node.chapterNumber}
      </span>
      <div className="flex flex-1 items-center rounded-2xl bg-surface p-3.5">
        <p className="text-[14.5px] font-bold text-ink-muted">{node.meta.name}</p>
      </div>
    </div>
  )
}

function RewardPreviewRow({ node }: { node: ChapterNodeState }) {
  const skin = getSkin(node.meta.skinId!)
  return (
    <div className="relative flex items-center gap-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted opacity-55 shadow-[0_0_0_4px_var(--color-bg)]">
        <LockIcon />
      </span>
      <div className="flex-1 rounded-2xl border-[1.5px] border-dashed border-accent/35 bg-surface p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex shrink-0 overflow-hidden rounded-[6px] shadow-[0_0_0_1px_var(--color-grid-gap)]">
            {skin.colors.slice(0, 6).map((c, i) => (
              <span key={i} className="size-[17px]" style={{ backgroundColor: c }} />
            ))}
          </span>
          <div className="flex-1">
            <p className="text-[13.5px] font-bold text-ink">{node.meta.name}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-ink-muted">
              {skin.name} skin at chapter {node.chapterNumber}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function EndlessTab({ route, endless }: { route: string; endless: EndlessProgress }) {
  const pct = Math.round((endless.levelInChapter / 20) * 100)
  const bossPreview = modifiersForLevel({ ...endless, levelInChapter: 19, isBoss: true })
  const activeModifierLabels = bossPreview ? modifierLabel(bossPreview).split(' · ').filter(Boolean) : []

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[28px] bg-accent p-5 text-white shadow-[0_16px_40px_-12px_color-mix(in_oklch,var(--color-accent)_60%,transparent)]">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20">
            <InfinityIcon />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-bold tracking-[0.16em] text-white/75 uppercase">Rank · {endless.rank}</p>
            <p className="mt-1.5 font-display text-[21px] font-extrabold">Endless · Chapter {endless.endlessChapter}</p>
          </div>
        </div>
        <div className="mt-4.5 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-white/85">Level {endless.levelInChapter + 1} of 20</span>
          <span className="font-mono text-[12px] font-bold text-white/85">{pct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
        </div>
        <Link
          to={`${route}/hard`}
          className="mt-4.5 flex h-[50px] items-center justify-center rounded-full bg-white text-[15px] font-extrabold text-accent"
        >
          Continue
        </Link>
      </div>

      {bossPreview && activeModifierLabels.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-[11px] font-bold tracking-[0.14em] text-ink-muted uppercase">Next boss level</p>
          <div className="rounded-[20px] bg-surface p-4 shadow-card">
            <p className="text-[14.5px] font-bold text-ink">
              Level 20 of chapter {endless.endlessChapter}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {activeModifierLabels.map((label) => {
                const Icon = MODIFIER_ICON[label] ?? PerfectRunIcon
                return (
                  <span
                    key={label}
                    className="flex h-[30px] items-center gap-1.5 rounded-full bg-accent-tint px-2.5 text-[12px] font-bold text-accent"
                  >
                    <Icon size={13} />
                    {label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="px-1 text-[11px] font-bold tracking-[0.14em] text-ink-muted uppercase">Story</p>
        <div className="flex items-center gap-3 rounded-[20px] bg-surface p-3.5 shadow-card">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent">
            <CheckIcon size={16} />
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-bold text-ink">All 30 chapters complete</p>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">Every skin earned</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FreePlayTab({ gameId, route }: { gameId: string; route: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-[12.5px] text-ink-muted">
        Freshly generated puzzles with no effect on your chapter progress — play as much as you like.
      </p>
      {DIFFICULTIES.map((d) => (
        <Link
          key={d}
          to={`${route}/free/${d}`}
          className="flex items-center gap-4 rounded-[20px] bg-surface p-4 shadow-card transition hover:shadow-md"
        >
          <div className="size-[58px] shrink-0 overflow-hidden rounded-xl bg-accent-tint p-2">{PREVIEW_BY_ID[gameId]}</div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`size-2 shrink-0 rounded-full ${
                  d === 'easy' ? 'bg-diff-easy' : d === 'medium' ? 'bg-diff-medium' : 'bg-diff-hard'
                }`}
              />
              <h2 className="text-[17px] font-bold">{d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'Hard'}</h2>
            </div>
            <p className="mt-0.5 text-[13px] text-ink-muted">{SIZE_LABEL[gameId](d)}</p>
          </div>
          <span className="text-ink-muted opacity-60">
            <ChevronRightIcon />
          </span>
        </Link>
      ))}
    </div>
  )
}
