import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { TabBar } from '../components/TabBar'
import { AppLink as Link } from '../components/AppLink'
import { Avatar } from '../components/Avatar'
import { formatElapsed } from '../components/Timer'
import { ChevronLeftIcon, ChevronRightIcon, CrownIcon, LightbulbIcon, TrophyIcon } from '../components/icons'
import { useAuth } from '../hooks/useAuth'
import { useBackupSync } from '../hooks/useBackupSync'
import { ApiError } from '../api/client'
import { fetchFriends, removeFriend, respondToFriendRequest, sendFriendRequest, type FriendsResponse } from '../api/friends'
import { fetchDailyBoard, fetchGameLeaderboard, type DailyBoard, type DailyBoardScore, type GameLeaderboardEntry } from '../api/scores'
import { GAMES } from '../games/registry'
import { PREVIEW_BY_ID } from '../games/gamePreviews'
import { dateKeyForOffset, dayLabel, summarizeDailyBoard, type DailyBoardSummary } from '../games/dailyBoard'

type Tab = 'friends' | 'daily' | 'game'
// Daily first and the default — comparing today's results is what this page is
// opened for most; the friends list is only needed occasionally.
const TABS: { key: Tab; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'game', label: 'By game' },
  { key: 'friends', label: 'Friends' },
]

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-4 bg-bg px-4 py-[max(2rem,env(safe-area-inset-top))] pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] text-ink">
      {children}
      <TabBar active="friends" />
    </main>
  )
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <PageShell>
        <h1 className="font-display text-[30px] font-extrabold tracking-tight">Friends</h1>
      </PageShell>
    )
  }

  if (!user) {
    return (
      <PageShell>
        <h1 className="font-display text-[30px] font-extrabold tracking-tight">Friends</h1>
        <div className="flex flex-col items-center gap-3 rounded-[22px] bg-surface p-6 text-center">
          <p className="text-[13.5px] text-ink-muted">Sign in to add friends and compare scores on the leaderboards.</p>
          <div className="flex w-full gap-2">
            <Link to="/login" className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-white">
              Sign in
            </Link>
            <Link to="/signup" className="flex-1 rounded-full bg-bg py-2.5 text-sm font-semibold text-ink-muted">
              Create account
            </Link>
          </div>
        </div>
      </PageShell>
    )
  }

  return <FriendsContent />
}

function FriendsContent() {
  const [tab, setTab] = useState<Tab>('daily')

  return (
    <PageShell>
      <h1 className="font-display text-[30px] font-extrabold tracking-tight">Friends</h1>

      <div className="flex gap-1 rounded-2xl bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${tab === t.key ? 'bg-accent text-white' : 'text-ink-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'friends' && <FriendsTab />}
      {tab === 'daily' && <DailyBoardTab onAddFriends={() => setTab('friends')} />}
      {tab === 'game' && <GameLeaderboardTab />}
    </PageShell>
  )
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong'
}

function FriendsTab() {
  const [data, setData] = useState<FriendsResponse | null>(null)
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const result = await fetchFriends()
    setData(result)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    if (!username.trim()) return
    setError(null)
    setBusy(true)
    try {
      await sendFriendRequest(username.trim())
      setUsername('')
      await load()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleRespond(otherUsername: string, accept: boolean) {
    setBusy(true)
    try {
      await respondToFriendRequest(otherUsername, accept)
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(otherUsername: string) {
    setBusy(true)
    try {
      await removeFriend(otherUsername)
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Add a friend by username"
          className="flex-1 rounded-2xl bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-muted/70 focus:ring-2 focus:ring-accent"
        />
        <button type="submit" disabled={busy} className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          Add
        </button>
      </form>
      {error && <p className="text-[13px] font-medium text-danger">{error}</p>}

      {data && data.incoming.length > 0 && (
        <Section title="Requests">
          {data.incoming.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5">
              <Avatar username={u.username} avatarType={u.avatarType} avatarValue={u.avatarValue} />
              <span className="flex-1 text-[14px] font-semibold text-ink">{u.username}</span>
              <button type="button" disabled={busy} onClick={() => handleRespond(u.username, true)} className="text-[13px] font-semibold text-accent">
                Accept
              </button>
              <button type="button" disabled={busy} onClick={() => handleRespond(u.username, false)} className="text-[13px] font-semibold text-ink-muted">
                Decline
              </button>
            </div>
          ))}
        </Section>
      )}

      {data && data.outgoing.length > 0 && (
        <Section title="Sent">
          {data.outgoing.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5">
              <Avatar username={u.username} avatarType={u.avatarType} avatarValue={u.avatarValue} />
              <span className="flex-1 text-[14px] font-semibold text-ink">{u.username}</span>
              <span className="text-[12px] text-ink-muted">Pending</span>
              <button type="button" disabled={busy} onClick={() => handleRemove(u.username)} className="text-[13px] font-semibold text-danger">
                Cancel
              </button>
            </div>
          ))}
        </Section>
      )}

      <Section title={`Friends${data ? ` (${data.friends.length})` : ''}`}>
        {data && data.friends.length === 0 && <p className="py-2 text-[13px] text-ink-muted">No friends yet — add one above.</p>}
        {data?.friends.map((u) => (
          <div key={u.id} className="flex items-center gap-3 py-2.5">
            <Avatar username={u.username} avatarType={u.avatarType} avatarValue={u.avatarValue} />
            <span className="flex-1 text-[14px] font-semibold text-ink">{u.username}</span>
            <button type="button" disabled={busy} onClick={() => handleRemove(u.username)} className="text-[13px] font-semibold text-ink-muted">
              Remove
            </button>
          </div>
        ))}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-[22px] bg-surface px-3.5 py-1">
      <p className="pt-2.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{title}</p>
      <div className="divide-y divide-ink/10">{children}</div>
    </div>
  )
}

function GameChips({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
      <div className="flex gap-1.5 whitespace-nowrap">
        {GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-pressed={active === g.id}
            onClick={() => onSelect(g.id)}
            className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold ${active === g.id ? 'bg-accent text-white' : 'bg-surface text-ink'}`}
          >
            {g.title}
          </button>
        ))}
      </div>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg text-[12px] font-bold text-ink-muted">{rank}</span>
  )
}

const GAME_IDS = GAMES.map((g) => g.id)
const RESYNC_ON_LOAD_MIN_INTERVAL_MS = 15_000

function DailyBoardTab({ onAddFriends }: { onAddFriends: () => void }) {
  const { syncRecentScores } = useBackupSync()
  const [dayOffset, setDayOffset] = useState(0)
  const [board, setBoard] = useState<DailyBoard | null>(null)
  const [failed, setFailed] = useState(false)
  const lastSyncRef = useRef(0)
  const dateKey = dateKeyForOffset(dayOffset)

  const load = useCallback(
    async (isCancelled: () => boolean) => {
      setFailed(false)
      // Push this device's recent results first, so a score whose live post was lost
      // shows up here rather than the board quietly missing it. Throttled so paging
      // back through past days doesn't resend the same week every tap.
      if (Date.now() - lastSyncRef.current > RESYNC_ON_LOAD_MIN_INTERVAL_MS) {
        lastSyncRef.current = Date.now()
        await syncRecentScores()
      }
      try {
        const result = await fetchDailyBoard(dateKey)
        if (!isCancelled()) setBoard(result)
      } catch {
        if (!isCancelled()) setFailed(true)
      }
    },
    [dateKey, syncRecentScores],
  )

  useEffect(() => {
    let cancelled = false
    setBoard(null)
    void load(() => cancelled)
    // Refresh on returning to the app, to pick up a friend's newly finished puzzles.
    function handleVisibility() {
      if (!document.hidden) void load(() => cancelled)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [load])

  const summary = board ? summarizeDailyBoard(board, GAME_IDS) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-2xl bg-surface px-1.5 py-1">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => setDayOffset((d) => d - 1)}
          className="flex size-9 items-center justify-center rounded-xl text-ink-muted active:bg-bg"
        >
          <ChevronLeftIcon size={18} />
        </button>
        <span className="text-[14px] font-bold text-ink">{dayLabel(dayOffset)}</span>
        <button
          type="button"
          aria-label="Next day"
          disabled={dayOffset === 0}
          onClick={() => setDayOffset((d) => Math.min(0, d + 1))}
          className="flex size-9 items-center justify-center rounded-xl text-ink-muted active:bg-bg disabled:opacity-30"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>

      {failed && !summary && (
        <button type="button" onClick={() => void load(() => false)} className="rounded-[22px] bg-surface p-5 text-[13px] font-medium text-ink-muted">
          Couldn't load the leaderboard. Tap to try again.
        </button>
      )}
      {!failed && !summary && <div className="h-[420px] animate-pulse rounded-[22px] bg-surface" aria-label="Loading" />}

      {summary && summary.players.length < 2 && (
        <div className="flex flex-col items-center gap-3 rounded-[22px] bg-surface p-5 text-center">
          <p className="text-[13.5px] text-ink-muted">Add a friend to compare daily results side by side.</p>
          <button type="button" onClick={onAddFriends} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white">
            Add a friend
          </button>
        </div>
      )}

      {summary && summary.players.length >= 2 && (
        <>
          <HeadToHead summary={summary} />
          <DailyGrid summary={summary} isToday={dayOffset === 0} />
        </>
      )}
    </div>
  )
}

function HeadToHead({ summary }: { summary: DailyBoardSummary }) {
  const topWins = Math.max(...summary.players.map((p) => summary.wins[p.userId]))
  // Crown only an outright leader — on a level day nobody's ahead.
  const soleLeader = summary.players.filter((p) => summary.wins[p.userId] === topWins).length === 1
  return (
    <div className="flex items-stretch justify-around gap-2 rounded-[22px] bg-surface px-3 py-4">
      {summary.players.map((p, i) => {
        const wins = summary.wins[p.userId]
        const leading = soleLeader && wins === topWins
        return (
          <div key={p.userId} className="flex flex-1 items-center gap-2">
            {i > 0 && <span className="text-[13px] font-bold text-ink-muted/60">–</span>}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="relative">
                <Avatar username={p.username} avatarType={p.avatarType} avatarValue={p.avatarValue} size={40} />
                {leading && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-accent">
                    <CrownIcon size={16} />
                  </span>
                )}
              </div>
              <span className="max-w-full truncate text-[12px] font-semibold text-ink-muted">{p.isMe ? 'You' : p.username}</span>
              <span className={`font-display text-[30px] leading-none font-extrabold tabular-nums ${leading ? 'text-accent' : 'text-ink'}`}>{wins}</span>
              <span className="text-[10.5px] font-medium text-ink-muted">
                {summary.played[p.userId]}/{GAMES.length} played
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatScore(score: DailyBoardScore): string {
  return score.gameId === 'wordle' ? `${score.guesses}/6` : formatElapsed(score.elapsedMs ?? 0)
}

function DailyGrid({ summary, isToday }: { summary: DailyBoardSummary; isToday: boolean }) {
  // Fixed-width player columns so every row's results line up under the avatars;
  // the card scrolls sideways rather than squashing once there are 3+ players.
  const columns = `minmax(6.5rem, 1fr) repeat(${summary.players.length}, 4.75rem)`
  return (
    <div className="overflow-x-auto rounded-[22px] bg-surface px-3 py-2 [scrollbar-width:none]">
      <div className="grid items-center" style={{ gridTemplateColumns: columns }}>
        <span />
        {summary.players.map((p) => (
          <div key={p.userId} className="flex flex-col items-center gap-0.5 pt-1 pb-2">
            <Avatar username={p.username} avatarType={p.avatarType} avatarValue={p.avatarValue} size={24} />
            <span className="max-w-full truncate text-[10.5px] font-semibold text-ink-muted">{p.isMe ? 'You' : p.username}</span>
          </div>
        ))}

        {summary.rows.map((row) => {
          const game = GAMES.find((g) => g.id === row.gameId)!
          return (
            <div key={row.gameId} className="contents">
              <div className="flex min-w-0 items-center gap-2.5 border-t border-ink/10 py-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-tint p-1.5">{PREVIEW_BY_ID[game.id]}</span>
                <span className="truncate text-[13.5px] font-semibold text-ink">{game.title}</span>
              </div>
              {summary.players.map((p) => {
                const cell = row.cells[p.userId]
                return (
                  <div key={p.userId} className="flex h-full items-center justify-center border-t border-ink/10 py-2">
                    {cell.score ? (
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[12.5px] font-bold tabular-nums ${
                          cell.isBest ? 'bg-accent-tint text-accent' : 'text-ink'
                        }`}
                      >
                        {cell.isBest && <CrownIcon size={11} />}
                        {formatScore(cell.score)}
                        {cell.score.assisted && <LightbulbIcon size={11} className="text-ink-muted" />}
                      </span>
                    ) : p.isMe && isToday ? (
                      <Link to={`${game.route}/daily`} className="rounded-full bg-accent px-3 py-1 text-[11.5px] font-bold text-white">
                        Play
                      </Link>
                    ) : (
                      <span className="text-[13px] text-ink-muted/60">—</span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      <p className="flex items-center gap-1 border-t border-ink/10 pt-2 pb-1 text-[10.5px] text-ink-muted">
        <CrownIcon size={10} /> best result
        <span className="mx-1">·</span>
        <LightbulbIcon size={10} /> hint used
      </p>
    </div>
  )
}

function GameLeaderboardTab() {
  const [gameId, setGameId] = useState(GAMES[0].id)
  const [entries, setEntries] = useState<GameLeaderboardEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setEntries(null)
    fetchGameLeaderboard(gameId).then((result) => !cancelled && setEntries(result.entries))
    return () => {
      cancelled = true
    }
  }, [gameId])

  return (
    <div className="flex flex-col gap-3">
      <GameChips active={gameId} onSelect={setGameId} />
      <Section title="All-time">
        {entries && entries.length === 0 && <p className="py-3 text-[13px] text-ink-muted">Nobody's solved one of these yet.</p>}
        {entries?.map((entry, i) => (
          <div key={entry.userId} className="flex items-center gap-3 py-3">
            <RankBadge rank={i + 1} />
            <Avatar username={entry.username} avatarType={entry.avatarType} avatarValue={entry.avatarValue} size={30} />
            <span className="flex-1 text-[14px] font-semibold text-ink">{entry.username}</span>
            <div className="flex items-center gap-1 text-accent">
              <TrophyIcon size={13} />
              <span className="text-[13px] font-bold tabular-nums">{entry.completedCount}</span>
            </div>
            <div className="text-right">
              <p className="font-mono text-[13px] font-bold tabular-nums">{entry.bestTimeMs != null ? formatElapsed(entry.bestTimeMs) : '—'}</p>
              <p className="text-[10px] text-ink-muted">best</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[13px] font-bold tabular-nums">{entry.averageTimeMs != null ? formatElapsed(entry.averageTimeMs) : '—'}</p>
              <p className="text-[10px] text-ink-muted">avg</p>
            </div>
          </div>
        ))}
      </Section>
    </div>
  )
}
