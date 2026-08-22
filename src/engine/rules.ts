import type { Coord } from './types.ts'

/** 8-directional "touching" rule for queens — local adjacency only, NOT a diagonal ray. */
export function isAdjacent(a: Coord, b: Coord): boolean {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1 && (a.row !== b.row || a.col !== b.col)
}

export function sameRow(a: Coord, b: Coord): boolean {
  return a.row === b.row
}

export function sameCol(a: Coord, b: Coord): boolean {
  return a.col === b.col
}

export function sameRegion(a: Coord, b: Coord, regions: number[][]): boolean {
  return regions[a.row][a.col] === regions[b.row][b.col]
}

export function conflicts(a: Coord, b: Coord, regions: number[][]): boolean {
  return sameRow(a, b) || sameCol(a, b) || sameRegion(a, b, regions) || isAdjacent(a, b)
}
