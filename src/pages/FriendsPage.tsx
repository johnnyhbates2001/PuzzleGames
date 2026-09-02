import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { TabBar } from '../components/TabBar'
import { AppLink as Link } from '../components/AppLink'
import { Avatar } from '../components/Avatar'
import { formatElapsed } from '../components/Timer'
import { TrophyIcon } from '../components/icons'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../api/client'
import { fetchFriends, removeFriend, respondToFriendRequest, sendFriendRequest, type FriendsResponse } from '../api/friends'
import { fetchDailyLeaderboard, fetchGameLeaderboard, type DailyLeaderboardEntry, type GameLeaderboardEntry } from '../api/scores'
import { GAMES } from '../games/registry'
import { todayDateKey } from '../games/dailyChallenge'

type Tab = 'friends' | 'daily' | 'game'
const TABS: { key: Tab; label: string }[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'daily', label: 'Daily' },
  { key: 'game', label: 'By game' },
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
  const [tab, setTab] = useState<Tab>('friends')

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
      {tab === 'daily' && <DailyLeaderboardTab />}
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

function DailyLeaderboardTab() {
  const [gameId, setGameId] = useState(GAMES[0].id)
  const [entries, setEntries] = useState<DailyLeaderboardEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setEntries(null)
    fetchDailyLeaderboard(gameId, todayDateKey()).then((result) => !cancelled && setEntries(result.entries))
    return () => {
      cancelled = true
    }
  }, [gameId])

  const isWordle = gameId === 'wordle'

  return (
    <div className="flex flex-col gap-3">
      <GameChips active={gameId} onSelect={setGameId} />
      <Section title="Today">
        {entries && entries.length === 0 && (
          <p className="py-3 text-[13px] text-ink-muted">No one's solved today's puzzle yet.</p>
        )}
        {entries?.map((entry, i) => (
          <div key={entry.userId} className="flex items-center gap-3 py-2.5">
            <RankBadge rank={i + 1} />
            <Avatar username={entry.username} avatarType={entry.avatarType} avatarValue={entry.avatarValue} size={30} />
            <span className="flex-1 text-[14px] font-semibold text-ink">{entry.username}</span>
            {entry.assisted && <span className="text-[10px] font-semibold text-ink-muted uppercase">Hint used</span>}
            <span className="font-mono text-[14px] font-bold tabular-nums text-ink">
              {isWordle ? `${entry.guesses}/6` : formatElapsed(entry.elapsedMs ?? 0)}
            </span>
          </div>
        ))}
      </Section>
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
