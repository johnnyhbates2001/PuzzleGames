export type Difficulty = 'easy' | 'medium' | 'hard'

// Real Zip stays mostly 6x6 across difficulty and leans on checkpoint sparsity/wall
// count for difficulty instead — 7x7's Hamiltonian-path search space is dramatically
// more expensive to verify unique, with enough variance to occasionally blow well past
// any reasonable generation budget, so hard stays at 6x6 too.
export const ZIP_SIZE: Record<Difficulty, number> = {
  easy: 5,
  medium: 6,
  hard: 6,
}

export interface Coord {
  row: number
  col: number
}

export function coordKey(c: Coord): string {
  return `${c.row},${c.col}`
}

const DELTAS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

/** In-bounds orthogonal neighbors, ignoring walls. */
export function gridNeighbors(size: number, cell: Coord): Coord[] {
  const out: Coord[] = []
  for (const [dr, dc] of DELTAS) {
    const r = cell.row + dr
    const c = cell.col + dc
    if (r >= 0 && r < size && c >= 0 && c < size) out.push({ row: r, col: c })
  }
  return out
}

/** Canonical, order-independent key for the edge between two orthogonally-adjacent cells. */
export function edgeKey(a: Coord, b: Coord): string {
  const ak = coordKey(a)
  const bk = coordKey(b)
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`
}

export interface ZipLevelRecord {
  id: string
  difficulty: Difficulty
  size: number
  /** Checkpoint cells in required visiting order — checkpoints[0] is "1", the fixed start. */
  checkpoints: Coord[]
  /** Edge keys (via edgeKey) the path may not cross. */
  walls: string[]
  /** The (verified unique) full Hamiltonian path. Never shown to the player. */
  solution: Coord[]
}
