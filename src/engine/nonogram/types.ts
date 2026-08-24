export type Difficulty = 'easy' | 'medium' | 'hard'

export const NONOGRAM_SIZE: Record<Difficulty, number> = {
  easy: 5,
  medium: 8,
  hard: 10,
}

export interface Coord {
  row: number
  col: number
}

export interface NonogramLevelRecord {
  id: string
  difficulty: Difficulty
  size: number
  /** Row-major solution grid — true = filled. */
  solution: boolean[][]
  /** Run-length clues per row/column, derived from `solution` (and stored rather than
   *  re-derived — the board renders them directly, and hint logic reads them too). An
   *  empty line's clue is the single-element `[0]`, matching standard nonogram notation. */
  rowClues: number[][]
  colClues: number[][]
}

export function coordKey(coord: Coord): string {
  return `${coord.row},${coord.col}`
}

/** The run-length clue for one line (a row or column) of filled/empty booleans. */
export function cluesForLine(line: boolean[]): number[] {
  const runs: number[] = []
  let run = 0
  for (const cell of line) {
    if (cell) {
      run++
    } else if (run > 0) {
      runs.push(run)
      run = 0
    }
  }
  if (run > 0) runs.push(run)
  return runs.length > 0 ? runs : [0]
}

export function cluesFromSolution(solution: boolean[][]): { rowClues: number[][]; colClues: number[][] } {
  const size = solution.length
  const rowClues = solution.map((row) => cluesForLine(row))
  const colClues: number[][] = []
  for (let c = 0; c < size; c++) {
    colClues.push(cluesForLine(solution.map((row) => row[c])))
  }
  return { rowClues, colClues }
}
