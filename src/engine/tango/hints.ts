import { propagate } from './solver.ts'
import { cloneGrid, edgeNeighbor, EMPTY, MOON, opposite, SUN, type Coord, type EdgeClue, type TangoGrid, type TangoValue } from './types.ts'

/**
 * "Show next step" hints for Tango
 * ---------------------------------
 * Walks the same rules the logic solver uses (solver.ts), one at a time, and returns
 * the first one that fills something on the player's current board, with a reason:
 * signs, "no three in a row" (pairs and gaps), full lines, and finally one-step
 * contradiction ("a sun here would break the rules"). Every level is verified solvable
 * with exactly these rules, so a step always exists on a mistake-free board. Mistakes
 * are pointed out first.
 */

export type TangoHint =
  | { kind: 'mistake'; cell: Coord; message: string; focus: Coord[] }
  | { kind: 'place'; cells: Coord[]; value: TangoValue; message: string; focus: Coord[] }

const NAME: Record<number, string> = { [SUN]: 'sun', [MOON]: 'moon' }
const PLURAL: Record<number, string> = { [SUN]: 'suns', [MOON]: 'moons' }

export function findTangoHint(grid: TangoGrid, solution: TangoGrid, edges: EdgeClue[]): TangoHint | null {
  const n = grid.length

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c]
      if (v !== EMPTY && v !== solution[r][c]) {
        return { kind: 'mistake', cell: { row: r, col: c }, message: `This ${NAME[v]} is wrong — it should be a ${NAME[opposite(v)]}.`, focus: [] }
      }
    }
  }

  const simple = simpleStep(grid, edges)
  if (simple) return simple

  // One-step contradiction: follow the moves a guess forces until a rule breaks.
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== EMPTY) continue
      for (const v of [SUN, MOON] as const) {
        const trial = cloneGrid(grid)
        trial[r][c] = v
        if (propagate(cloneGrid(trial), edges)) continue
        const value = opposite(v)
        const broken = traceContradiction(trial, edges)
        const forced = broken ? (broken.forced === 0 ? '' : ` and follow the ${broken.forced} move${broken.forced === 1 ? '' : 's'} it forces`) : ' and follow the moves it forces'
        return {
          kind: 'place',
          cells: [{ row: r, col: c }],
          value,
          message: `Imagine a ${NAME[v]} here${forced}: ${broken ? broken.reason : 'you end up breaking a rule'}. So it has to be a ${NAME[value]}.`,
          focus: broken ? broken.focus : [],
        }
      }
    }
  }

  // Shouldn't happen on a verified level — reveal a square, honestly.
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== EMPTY) continue
      return {
        kind: 'place',
        cells: [{ row: r, col: c }],
        value: solution[r][c],
        message: `There's no simple deduction left from here, so here's this square: a ${NAME[solution[r][c]]}.`,
        focus: [],
      }
    }
  }
  return null
}

type PlaceHint = Extract<TangoHint, { kind: 'place' }>

function pairHint(cell: Coord, pairValue: TangoValue, pair: Coord[]): PlaceHint {
  const value = opposite(pairValue)
  return {
    kind: 'place',
    cells: [cell],
    value,
    message: `Two ${PLURAL[pairValue]} are already side by side. A third would make three in a row, so this square is a ${NAME[value]}.`,
    focus: pair,
  }
}

/** The first sign / no-three-in-a-row / full-line deduction on `grid`, ignoring any
 *  solution — also used to play out a guess in traceContradiction. */
function simpleStep(grid: TangoGrid, edges: EdgeClue[]): PlaceHint | null {
  const n = grid.length
  const half = n / 2
  // Signs.
  for (const edge of edges) {
    const a = { row: edge.row, col: edge.col }
    const b = edgeNeighbor(edge)
    const va = grid[a.row][a.col]
    const vb = grid[b.row][b.col]
    if ((va === EMPTY) === (vb === EMPTY)) continue
    const [known, unknown, kv] = va !== EMPTY ? [a, b, va] : [b, a, vb]
    const value = edge.kind === 'same' ? kv : opposite(kv)
    return {
      kind: 'place',
      cells: [unknown],
      value,
      message:
        edge.kind === 'same'
          ? `These two squares are joined by an =, so they match: this one is a ${NAME[value]} too.`
          : `These two squares are joined by a ×, so they're opposites: next to a ${NAME[kv]}, this one is a ${NAME[value]}.`,
      focus: [known, unknown],
    }
  }

  const lines = lineList(n)
  const at = (p: Coord) => grid[p.row][p.col]

  // No three in a row: a pair blocks both ends, and a gap between two matches flips.
  for (const line of lines) {
    for (let i = 0; i + 2 < n; i++) {
      const [x, y, z] = [line.cells[i], line.cells[i + 1], line.cells[i + 2]]
      if (at(x) !== EMPTY && at(x) === at(y) && at(z) === EMPTY) {
        return pairHint(z, at(x), [x, y])
      }
      if (at(y) !== EMPTY && at(y) === at(z) && at(x) === EMPTY) {
        return pairHint(x, at(y), [y, z])
      }
      if (at(x) !== EMPTY && at(x) === at(z) && at(y) === EMPTY) {
        const value = opposite(at(x))
        return {
          kind: 'place',
          cells: [y],
          value,
          message: `This square sits between two ${PLURAL[at(x)]}. Another ${NAME[at(x)]} would make three in a row, so it's a ${NAME[value]}.`,
          focus: [x, z],
        }
      }
    }
  }

  // Full lines: half of one symbol already placed fills the rest with the other.
  for (const line of lines) {
    for (const symbol of [SUN, MOON] as const) {
      const count = line.cells.filter((p) => at(p) === symbol).length
      const empty = line.cells.filter((p) => at(p) === EMPTY)
      if (count !== half || empty.length === 0) continue
      const value = opposite(symbol)
      const Name = line.name.charAt(0).toUpperCase() + line.name.slice(1)
      return {
        kind: 'place',
        cells: empty,
        value,
        message: `${Name} already has its ${half} ${PLURAL[symbol]}, so every empty square left in it is a ${NAME[value]}.`,
        focus: line.cells,
      }
    }
  }

  return null
}

function lineList(n: number): { name: string; cells: Coord[] }[] {
  const lines: { name: string; cells: Coord[] }[] = []
  for (let i = 0; i < n; i++) {
    lines.push({ name: `row ${i + 1}`, cells: Array.from({ length: n }, (_, c) => ({ row: i, col: c })) })
    lines.push({ name: `column ${i + 1}`, cells: Array.from({ length: n }, (_, r) => ({ row: r, col: i })) })
  }
  return lines
}

/** Which rule `grid` currently breaks, if any, in words. */
function brokenRule(grid: TangoGrid, edges: EdgeClue[]): { reason: string; focus: Coord[] } | null {
  const n = grid.length
  const at = (p: Coord) => grid[p.row][p.col]
  for (const line of lineList(n)) {
    for (let i = 0; i + 2 < n; i++) {
      const trio = line.cells.slice(i, i + 3)
      const v = at(trio[0])
      if (v !== EMPTY && trio.every((p) => at(p) === v)) return { reason: `${line.name} would have three ${PLURAL[v]} in a row`, focus: trio }
    }
    for (const symbol of [SUN, MOON] as const) {
      const count = line.cells.filter((p) => at(p) === symbol).length
      if (count > n / 2) return { reason: `${line.name} would end up with ${count} ${PLURAL[symbol]} — more than half`, focus: line.cells }
    }
  }
  for (const edge of edges) {
    const b = edgeNeighbor(edge)
    const va = grid[edge.row][edge.col]
    const vb = grid[b.row][b.col]
    if (va === EMPTY || vb === EMPTY || (edge.kind === 'same') === (va === vb)) continue
    return { reason: `the ${edge.kind === 'same' ? '=' : '×'} sign between two squares would be broken`, focus: [{ row: edge.row, col: edge.col }, b] }
  }
  return null
}

/** Plays out `grid` (holding a guess) one simple deduction at a time until a rule breaks. */
function traceContradiction(grid: TangoGrid, edges: EdgeClue[]): { reason: string; focus: Coord[]; forced: number } | null {
  const trial = cloneGrid(grid)
  for (let forced = 0; forced <= trial.length * trial.length; forced++) {
    const broken = brokenRule(trial, edges)
    if (broken) return { ...broken, forced }
    const step = simpleStep(trial, edges)
    if (!step) return null
    for (const p of step.cells) trial[p.row][p.col] = step.value
  }
  return null
}
