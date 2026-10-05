import { describe, expect, it } from 'vitest'
import { findQueensHint, type QueensBoardView } from './hints'
import type { LevelRecord } from './types'
import easyBank from '../data/banks/easy.json'
import hardBank from '../data/banks/hard.json'

function emptyView(size: number): QueensBoardView[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => ({ queen: false, x: false })))
}

describe('findQueensHint', () => {
  for (const [name, bank] of [['easy', easyBank], ['hard', hardBank]] as const) {
    it(`solves ${name} levels from empty using only correct, explained steps`, () => {
      for (const level of (bank as unknown as LevelRecord[]).slice(0, 15)) {
        const board = emptyView(level.size)
        for (let i = 0; i < 200; i++) {
          const hint = findQueensHint(level, board)
          if (!hint) break
          expect(hint.kind).not.toBe('mistake')
          expect(hint.message).not.toMatch(/no simple deduction/)
          if (hint.kind === 'queen') {
            expect(level.solution[hint.cell.row].col).toBe(hint.cell.col)
            board[hint.cell.row][hint.cell.col].queen = true
          } else if (hint.kind === 'cross') {
            for (const p of hint.cells) {
              expect(level.solution[p.row].col).not.toBe(p.col)
              board[p.row][p.col].x = true
            }
          }
        }
        expect(level.solution.every((p) => board[p.row][p.col].queen)).toBe(true)
      }
    })
  }

  it('points out a wrong queen before anything else', () => {
    const level = (easyBank as unknown as LevelRecord[])[0]
    const board = emptyView(level.size)
    const wrongCol = (level.solution[0].col + 2) % level.size
    board[0][wrongCol].queen = true
    const hint = findQueensHint(level, board)
    expect(hint).toMatchObject({ kind: 'mistake', cell: { row: 0, col: wrongCol } })
  })

  it('points out an X sitting on a queen square', () => {
    const level = (easyBank as unknown as LevelRecord[])[0]
    const board = emptyView(level.size)
    board[2][level.solution[2].col].x = true
    expect(findQueensHint(level, board)).toMatchObject({ kind: 'mistake', cell: { row: 2, col: level.solution[2].col } })
  })
})
