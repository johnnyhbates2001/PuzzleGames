import { describe, expect, it } from 'vitest'
import { boardFromPuzzle, digitCounts } from './sudokuTypes'
import { SUDOKU_SIZE } from '../engine/sudoku/types'

function blankGrid(): number[][] {
  return Array.from({ length: SUDOKU_SIZE }, () => new Array(SUDOKU_SIZE).fill(0))
}

describe('digitCounts', () => {
  it('is all zero for an empty board', () => {
    const board = boardFromPuzzle(blankGrid())
    expect(digitCounts(board)).toEqual(new Array(10).fill(0))
  })

  it('counts given and placed values together', () => {
    const puzzle = blankGrid()
    puzzle[0][0] = 5
    puzzle[0][1] = 5
    const board = boardFromPuzzle(puzzle)
    board[1][0].value = 5

    const counts = digitCounts(board)
    expect(counts[5]).toBe(3)
    expect(counts[1]).toBe(0)
  })
})
