import { describe, expect, it } from 'vitest'
import { navDepth, navDirection } from './navDirection'

describe('navDepth', () => {
  it('treats Home and the other top-level tabs as depth 0', () => {
    expect(navDepth('/')).toBe(0)
    expect(navDepth('/shop')).toBe(0)
    expect(navDepth('/stats')).toBe(0)
    expect(navDepth('/achievements')).toBe(0)
  })

  it('counts path segments for everything else', () => {
    expect(navDepth('/queens')).toBe(1)
    expect(navDepth('/queens/easy')).toBe(2)
    expect(navDepth('/queens/easy/complete')).toBe(3)
    expect(navDepth('/queens/daily')).toBe(2)
  })
})

describe('navDirection', () => {
  it('is forward when moving to a deeper route', () => {
    expect(navDirection('/queens', '/queens/easy')).toBe('forward')
    expect(navDirection('/', '/queens')).toBe('forward')
  })

  it('is back when moving to a shallower route', () => {
    expect(navDirection('/queens/easy', '/queens')).toBe('back')
    expect(navDirection('/queens', '/')).toBe('back')
  })

  it('is peer for lateral moves at the same depth', () => {
    expect(navDirection('/', '/shop')).toBe('peer')
    expect(navDirection('/shop', '/stats')).toBe('peer')
  })

  it('is always peer when either end is the Complete screen (depth 3)', () => {
    expect(navDirection('/queens/easy', '/queens/easy/complete')).toBe('peer')
    expect(navDirection('/queens/easy/complete', '/queens/easy')).toBe('peer')
    expect(navDirection('/queens/easy/complete', '/')).toBe('peer')
  })

  it('accepts an object `to` target', () => {
    expect(navDirection('/queens', { pathname: '/queens/easy' })).toBe('forward')
  })
})
