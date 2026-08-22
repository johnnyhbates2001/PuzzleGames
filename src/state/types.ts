/** Per-cell interaction state — shared between the game reducer and the storage layer. */
export interface CellState {
  queen: boolean
  manualX: boolean
  /** ids ("row,col") of queens whose auto-X placement covers this cell. */
  autoXSources: Set<string>
}

export function emptyCell(): CellState {
  return { queen: false, manualX: false, autoXSources: new Set() }
}

export function hasX(cell: CellState): boolean {
  return cell.manualX || cell.autoXSources.size > 0
}

export function emptyBoard(size: number): CellState[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => emptyCell()))
}

export function cloneBoard(board: CellState[][]): CellState[][] {
  return board.map((row) => row.map((cell) => ({ ...cell, autoXSources: new Set(cell.autoXSources) })))
}
