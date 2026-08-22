import { coordKey, edgeKey, gridNeighbors, type Coord, type ZipLevelRecord } from './types.ts'

/**
 * Given the path drawn so far and the next cell the player wants to enter, returns
 * the resulting path — either extended by one cell, shortened by one (dragging back
 * over the second-to-last cell erases the last step), or unchanged if the move is
 * illegal (not adjacent, already visited elsewhere in the path, crosses a wall, or
 * jumps to a checkpoint out of order).
 */
export function applyCellEntry(path: Coord[], level: ZipLevelRecord, next: Coord): Coord[] {
  const nextKey = coordKey(next)

  if (path.length === 0) {
    return nextKey === coordKey(level.checkpoints[0]) ? [next] : path
  }

  const lastKey = coordKey(path[path.length - 1])
  if (nextKey === lastKey) return path

  if (path.length >= 2 && nextKey === coordKey(path[path.length - 2])) {
    return path.slice(0, -1)
  }

  const last = path[path.length - 1]
  const isAdjacent = gridNeighbors(level.size, last).some((nb) => coordKey(nb) === nextKey)
  if (!isAdjacent) return path
  if (level.walls.includes(edgeKey(last, next))) return path
  if (path.some((c) => coordKey(c) === nextKey)) return path // already visited earlier in the path

  const cpIndex = level.checkpoints.findIndex((c) => coordKey(c) === nextKey)
  if (cpIndex !== -1) {
    const nextRequiredCp = path.filter((c) => level.checkpoints.some((cp) => coordKey(cp) === coordKey(c))).length
    if (cpIndex !== nextRequiredCp) return path
  }

  return [...path, next]
}

export function isSolved(path: Coord[], level: ZipLevelRecord): boolean {
  return path.length === level.size * level.size
}
