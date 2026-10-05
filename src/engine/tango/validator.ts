import { coordKey, edgeNeighbor, EMPTY, MOON, SUN, type EdgeClue, type TangoGrid } from './types.ts'

/** Cell keys ("row,col") currently breaking a rule: part of three-in-a-row, a symbol in
 *  a line that already has more than half of it, or either side of a violated sign. */
export function getConflicts(grid: TangoGrid, edges: EdgeClue[]): Set<string> {
  const n = grid.length
  const half = n / 2
  const bad = new Set<string>()

  for (let line = 0; line < n; line++) {
    for (const horizontal of [true, false]) {
      const at = (i: number) => (horizontal ? grid[line][i] : grid[i][line])
      const key = (i: number) => (horizontal ? coordKey({ row: line, col: i }) : coordKey({ row: i, col: line }))

      for (let i = 0; i + 2 < n; i++) {
        const v = at(i)
        if (v !== EMPTY && at(i + 1) === v && at(i + 2) === v) {
          bad.add(key(i))
          bad.add(key(i + 1))
          bad.add(key(i + 2))
        }
      }

      for (const symbol of [SUN, MOON]) {
        let count = 0
        for (let i = 0; i < n; i++) if (at(i) === symbol) count++
        if (count <= half) continue
        for (let i = 0; i < n; i++) if (at(i) === symbol) bad.add(key(i))
      }
    }
  }

  for (const edge of edges) {
    const a = grid[edge.row][edge.col]
    const nb = edgeNeighbor(edge)
    const b = grid[nb.row][nb.col]
    if (a === EMPTY || b === EMPTY) continue
    if ((edge.kind === 'same') !== (a === b)) {
      bad.add(coordKey(edge))
      bad.add(coordKey(nb))
    }
  }

  return bad
}

export function isSolved(grid: TangoGrid, edges: EdgeClue[]): boolean {
  if (grid.some((row) => row.some((v) => v === EMPTY))) return false
  return getConflicts(grid, edges).size === 0
}
