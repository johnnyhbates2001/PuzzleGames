import { describe, expect, it } from 'vitest'
import { dateKeyForOffset, summarizeDailyBoard } from './dailyBoard'
import type { DailyBoard, DailyBoardPlayer, DailyBoardScore } from '../api/scores'

function player(userId: string, isMe = false): DailyBoardPlayer {
  return { userId, username: userId, avatarType: 'preset', avatarValue: 'a', isMe }
}

function timed(userId: string, gameId: string, elapsedMs: number, assisted = false): DailyBoardScore {
  return { userId, gameId, elapsedMs, guesses: null, assisted }
}

function wordle(userId: string, guesses: number): DailyBoardScore {
  return { userId, gameId: 'wordle', elapsedMs: null, guesses, assisted: false }
}

describe('summarizeDailyBoard', () => {
  it('puts the caller first, then friends alphabetically', () => {
    const board: DailyBoard = { players: [player('zed'), player('me', true), player('amy')], scores: [] }
    expect(summarizeDailyBoard(board, ['queens']).players.map((p) => p.userId)).toEqual(['me', 'amy', 'zed'])
  })

  it('crowns the fastest time and counts it as a win', () => {
    const board: DailyBoard = {
      players: [player('me', true), player('amy')],
      scores: [timed('me', 'queens', 90_000), timed('amy', 'queens', 60_000)],
    }
    const summary = summarizeDailyBoard(board, ['queens'])
    expect(summary.rows[0].cells.amy.isBest).toBe(true)
    expect(summary.rows[0].cells.me.isBest).toBe(false)
    expect(summary.wins).toEqual({ me: 0, amy: 1 })
    expect(summary.played).toEqual({ me: 1, amy: 1 })
  })

  it('scores Wordle by fewest guesses', () => {
    const board: DailyBoard = { players: [player('me', true), player('amy')], scores: [wordle('me', 3), wordle('amy', 5)] }
    expect(summarizeDailyBoard(board, ['wordle']).wins).toEqual({ me: 1, amy: 0 })
  })

  it('crowns everyone on a tie but awards no win', () => {
    const board: DailyBoard = { players: [player('me', true), player('amy')], scores: [wordle('me', 4), wordle('amy', 4)] }
    const summary = summarizeDailyBoard(board, ['wordle'])
    expect(summary.rows[0].cells.me.isBest).toBe(true)
    expect(summary.rows[0].cells.amy.isBest).toBe(true)
    expect(summary.wins).toEqual({ me: 0, amy: 0 })
  })

  it('leads a game nobody else has played yet', () => {
    const board: DailyBoard = { players: [player('me', true), player('amy')], scores: [timed('me', 'zip', 30_000)] }
    const summary = summarizeDailyBoard(board, ['zip', 'tango'])
    expect(summary.rows[0].cells.me.isBest).toBe(true)
    expect(summary.rows[0].cells.amy.score).toBeNull()
    expect(summary.rows[1].cells.me.score).toBeNull()
    expect(summary.wins).toEqual({ me: 1, amy: 0 })
  })

  it('crowns nobody with no friends on the board', () => {
    const board: DailyBoard = { players: [player('me', true)], scores: [timed('me', 'zip', 30_000)] }
    const summary = summarizeDailyBoard(board, ['zip'])
    expect(summary.rows[0].cells.me.isBest).toBe(false)
    expect(summary.wins).toEqual({ me: 0 })
  })

  it('ignores scores from users not on the board', () => {
    const board: DailyBoard = { players: [player('me', true), player('amy')], scores: [timed('me', 'zip', 30_000), timed('gone', 'zip', 5_000)] }
    expect(summarizeDailyBoard(board, ['zip']).rows[0].cells.me.isBest).toBe(true)
  })
})

describe('dateKeyForOffset', () => {
  it('steps by calendar day across month boundaries', () => {
    const now = new Date(2026, 2, 1, 0, 30) // 1 Mar, just after midnight
    expect(dateKeyForOffset(0, now)).toBe('2026-03-01')
    expect(dateKeyForOffset(-1, now)).toBe('2026-02-28')
  })
})
