export interface AchievementContext {
  totalSolved: number
  solvedByGame: Record<string, number>
  streak: number
  /** The longest current Daily Challenge streak across the 5 games — each game now has
   *  its own daily puzzle and its own streak, so this achievement context tracks the best
   *  one rather than one shared number. */
  maxDailyStreak: number
  unassistedCompletions: number
  ownedSkinCount: number
  totalSkinCount: number
}

/** Keyed to one of 5 shared SVG marks (see AwardsPage.tsx's ICON_BY_GROUP) rather than
 *  each achievement carrying its own emoji — see design_handoff README: "eighteen emoji
 *  become five drawn marks reused across the set." */
export type AchievementIconGroup = 'star' | 'target' | 'flame' | 'gem' | 'crown'

export interface AchievementDef {
  id: string
  title: string
  description: string
  iconGroup: AchievementIconGroup
  check: (ctx: AchievementContext) => boolean
}

const GAME_LABELS: Record<string, string> = {
  queens: 'Queens',
  sudoku: 'Sudoku',
  zip: 'Zip',
  patches: 'Patches',
  nonogram: 'Nonogram',
}

function perGameExpertAchievements(): AchievementDef[] {
  return Object.entries(GAME_LABELS).map(([id, label]) => ({
    id: `${id}-expert`,
    title: `${label} Expert`,
    description: `Solve 20 ${label} puzzles.`,
    iconGroup: 'target',
    check: (ctx) => (ctx.solvedByGame[id] ?? 0) >= 20,
  }))
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Solve your first puzzle.',
    iconGroup: 'star',
    check: (ctx) => ctx.totalSolved >= 1,
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Solve 10 puzzles.',
    iconGroup: 'star',
    check: (ctx) => ctx.totalSolved >= 10,
  },
  {
    id: 'enthusiast',
    title: 'Enthusiast',
    description: 'Solve 50 puzzles.',
    iconGroup: 'star',
    check: (ctx) => ctx.totalSolved >= 50,
  },
  {
    id: 'century',
    title: 'Century',
    description: 'Solve 100 puzzles.',
    iconGroup: 'star',
    check: (ctx) => ctx.totalSolved >= 100,
  },
  {
    id: 'puzzle-master',
    title: 'Puzzle Master',
    description: 'Solve 250 puzzles.',
    iconGroup: 'crown',
    check: (ctx) => ctx.totalSolved >= 250,
  },
  {
    id: 'all-rounder',
    title: 'All-Rounder',
    description: 'Solve at least one puzzle in every game.',
    iconGroup: 'star',
    check: (ctx) => Object.keys(GAME_LABELS).every((id) => (ctx.solvedByGame[id] ?? 0) >= 1),
  },
  ...perGameExpertAchievements(),
  {
    id: 'week-warrior',
    title: 'Week Warrior',
    description: 'Reach a 7-day solving streak.',
    iconGroup: 'flame',
    check: (ctx) => ctx.streak >= 7,
  },
  {
    id: 'unstoppable',
    title: 'Unstoppable',
    description: 'Reach a 30-day solving streak.',
    iconGroup: 'flame',
    check: (ctx) => ctx.streak >= 30,
  },
  {
    id: 'flawless',
    title: 'Flawless',
    description: 'Solve 25 puzzles without a hint.',
    iconGroup: 'gem',
    check: (ctx) => ctx.unassistedCompletions >= 25,
  },
  {
    id: 'collector',
    title: 'Collector',
    description: 'Own every board skin.',
    iconGroup: 'crown',
    check: (ctx) => ctx.totalSkinCount > 0 && ctx.ownedSkinCount >= ctx.totalSkinCount,
  },
  {
    id: 'daily-devotee',
    title: 'Daily Devotee',
    description: 'Reach a 7-day Daily Challenge streak in any one game.',
    iconGroup: 'flame',
    check: (ctx) => ctx.maxDailyStreak >= 7,
  },
  {
    id: 'dedicated',
    title: 'Dedicated',
    description: 'Reach a 30-day Daily Challenge streak in any one game.',
    iconGroup: 'flame',
    check: (ctx) => ctx.maxDailyStreak >= 30,
  },
]
