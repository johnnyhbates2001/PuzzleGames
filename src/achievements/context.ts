import { GAMES } from '../games/registry'
import { SKINS } from '../skins'
import type { AchievementContext } from './definitions'
import {
  getDailyStreak,
  getNonogramProgress,
  getPatchesProgress,
  getProgress,
  getSettings,
  getStreak,
  getSudokuProgress,
  getZipProgress,
  getWordleProgress,
  type DifficultyProgress,
} from '../storage/db'
import type { Difficulty } from '../engine/types'
import type { DailyGameId } from '../games/dailyChallenge'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

const PROGRESS_GETTER: Record<string, (d: Difficulty) => Promise<DifficultyProgress>> = {
  queens: getProgress,
  sudoku: getSudokuProgress,
  zip: getZipProgress,
  patches: getPatchesProgress,
  nonogram: getNonogramProgress,
  wordle: getWordleProgress,
}

async function solvedForGame(gameId: string): Promise<number> {
  const getter = PROGRESS_GETTER[gameId]
  const results = await Promise.all(DIFFICULTIES.map((d) => getter(d)))
  return results.reduce((sum, p) => sum + p.completedCount, 0)
}

/** Builds the shared achievement-check context — used by AwardsPage to render the
 *  Awards grid and by ShopPage to gate achievement-locked cosmetics, so both read the
 *  exact same unlock truth instead of drifting apart. */
export async function buildAchievementContext(): Promise<AchievementContext> {
  const [settings, streak, dailyStreaks, solvedEntries] = await Promise.all([
    getSettings(),
    getStreak(),
    Promise.all(GAMES.map((g) => getDailyStreak(g.id as DailyGameId))),
    Promise.all(GAMES.map(async (g) => [g.id, await solvedForGame(g.id)] as const)),
  ])
  const solvedByGame = Object.fromEntries(solvedEntries)
  const totalSolved = solvedEntries.reduce((sum, [, n]) => sum + n, 0)
  const maxDailyStreak = dailyStreaks.length > 0 ? Math.max(...dailyStreaks) : 0
  return {
    totalSolved,
    solvedByGame,
    streak,
    maxDailyStreak,
    unassistedCompletions: settings.unassistedCompletions,
    ownedSkinCount: settings.ownedSkins.length,
    totalSkinCount: SKINS.length,
  }
}
