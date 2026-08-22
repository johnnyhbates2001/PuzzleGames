export type Difficulty = 'easy' | 'medium' | 'hard'

// Chosen so every difficulty's tap targets clear Apple's 44pt minimum on the
// smallest current iPhone (SE, 375pt) — see the cell-size measurements that drove
// this: 6x6=58.7px, 7x7=50.1px, 8x8=43.75px (0.25px under on SE only, fine on every
// larger current iPhone).
export const DIFFICULTY_SIZE: Record<Difficulty, number> = {
  easy: 6,
  medium: 7,
  hard: 8,
}

export interface Coord {
  row: number
  col: number
}

/** size x size grid of region ids (0..size-1) */
export type RegionGrid = number[][]

export interface LevelRecord {
  id: string
  difficulty: Difficulty
  size: number
  regions: RegionGrid
  /** Queen coordinates of the (verified unique) solution, index = row. Never shown to the player. */
  solution: Coord[]
}

export function coordKey(c: Coord): string {
  return `${c.row},${c.col}`
}
