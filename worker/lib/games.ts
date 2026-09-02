// Mirrors src/games/dailyChallenge.ts's DAILY_GAMES / src/games/registry.ts's GAMES —
// duplicated rather than shared since the Worker and the app bundle are separate
// TypeScript projects (see tsconfig.worker.json) with no runtime code shared between them.
export const GAME_IDS = ['queens', 'sudoku', 'zip', 'patches', 'nonogram', 'wordle'] as const
export type GameId = (typeof GAME_IDS)[number]

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export type DifficultyId = (typeof DIFFICULTIES)[number]

export function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && (GAME_IDS as readonly string[]).includes(value)
}

export function isDifficultyId(value: unknown): value is DifficultyId {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value)
}
