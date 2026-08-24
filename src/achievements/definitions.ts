export interface AchievementContext {
  totalSolved: number
  solvedByGame: Record<string, number>
  streak: number
  dailyStreak: number
  unassistedCompletions: number
  ownedSkinCount: number
  totalSkinCount: number
}

export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
  check: (ctx: AchievementContext) => boolean
}

const GAME_LABELS: Record<string, string> = { queens: 'Queens', sudoku: 'Sudoku', zip: 'Zip', patches: 'Patches' }

function perGameExpertAchievements(): AchievementDef[] {
  return Object.entries(GAME_LABELS).map(([id, label]) => ({
    id: `${id}-expert`,
    title: `${label} Expert`,
    description: `Solve 20 ${label} puzzles.`,
    icon: '🎯',
    check: (ctx) => (ctx.solvedByGame[id] ?? 0) >= 20,
  }))
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Solve your first puzzle.',
    icon: '🌱',
    check: (ctx) => ctx.totalSolved >= 1,
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Solve 10 puzzles.',
    icon: '✨',
    check: (ctx) => ctx.totalSolved >= 10,
  },
  {
    id: 'enthusiast',
    title: 'Enthusiast',
    description: 'Solve 50 puzzles.',
    icon: '⭐',
    check: (ctx) => ctx.totalSolved >= 50,
  },
  {
    id: 'century',
    title: 'Century',
    description: 'Solve 100 puzzles.',
    icon: '💯',
    check: (ctx) => ctx.totalSolved >= 100,
  },
  {
    id: 'puzzle-master',
    title: 'Puzzle Master',
    description: 'Solve 250 puzzles.',
    icon: '👑',
    check: (ctx) => ctx.totalSolved >= 250,
  },
  {
    id: 'all-rounder',
    title: 'All-Rounder',
    description: 'Solve at least one puzzle in every game.',
    icon: '🧩',
    check: (ctx) => Object.keys(GAME_LABELS).every((id) => (ctx.solvedByGame[id] ?? 0) >= 1),
  },
  ...perGameExpertAchievements(),
  {
    id: 'week-warrior',
    title: 'Week Warrior',
    description: 'Reach a 7-day solving streak.',
    icon: '🔥',
    check: (ctx) => ctx.streak >= 7,
  },
  {
    id: 'unstoppable',
    title: 'Unstoppable',
    description: 'Reach a 30-day solving streak.',
    icon: '🚀',
    check: (ctx) => ctx.streak >= 30,
  },
  {
    id: 'flawless',
    title: 'Flawless',
    description: 'Solve 25 puzzles without a hint.',
    icon: '💎',
    check: (ctx) => ctx.unassistedCompletions >= 25,
  },
  {
    id: 'collector',
    title: 'Collector',
    description: 'Own every board skin.',
    icon: '🎨',
    check: (ctx) => ctx.totalSkinCount > 0 && ctx.ownedSkinCount >= ctx.totalSkinCount,
  },
  {
    id: 'daily-devotee',
    title: 'Daily Devotee',
    description: 'Reach a 7-day Daily Challenge streak.',
    icon: '📅',
    check: (ctx) => ctx.dailyStreak >= 7,
  },
  {
    id: 'dedicated',
    title: 'Dedicated',
    description: 'Reach a 30-day Daily Challenge streak.',
    icon: '🏅',
    check: (ctx) => ctx.dailyStreak >= 30,
  },
]
