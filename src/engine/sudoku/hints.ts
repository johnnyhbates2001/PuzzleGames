import { boxIndex, type Coord, type DigitGrid } from './types.ts'
import { cageIndexGrid, type Cage } from '../killer/types.ts'
import { cageOptions } from '../killer/solver.ts'

/**
 * "Show next step" hints for Sudoku and Killer Sudoku
 * ----------------------------------------------------
 * Looks at the player's current board and finds the next move a person could make
 * by pure logic, plus a plain-English reason, rather than revealing an arbitrary
 * square. In order:
 *
 *  1. A mistake — a placed digit that doesn't match the solution — is pointed out
 *     first, since every deduction after it would be built on sand.
 *  2. Killer only: a cage with one empty square left is just its sum minus the rest.
 *  3. Hidden single: a digit with exactly one possible square left in a box/row/column.
 *  4. Naked single: a square with exactly one possible digit left.
 *  5. If neither exists, the next step is an elimination rather than a digit: one
 *     pointing / claiming / pair / cage-combination / 45-rule deduction that rules a
 *     digit out of some squares. The hint is just that one step — the player crosses
 *     it off (in their notes, or in their head) and asks again for the next.
 *     Eliminations already taught are passed back in as `excluded`, so each hint
 *     builds on the last instead of restarting from the bare board.
 *  6. Failing all that (some hard puzzles need techniques beyond these), it reveals the
 *     most-constrained square and says so honestly.
 */

export type SudokuHint =
  | { kind: 'mistake'; cell: Coord; message: string; focus: Coord[] }
  | { kind: 'place'; cell: Coord; digit: number; message: string; focus: Coord[] }
  /** `digits` can't go in any of `cells` — nothing to place yet, just options to cross off. */
  | { kind: 'eliminate'; cells: Coord[]; digits: number[]; message: string; focus: Coord[] }

interface HintInput {
  values: DigitGrid
  solution: DigitGrid
  cages?: Cage[]
  /** Per square, a bitmask (bit d-1 for digit d) of digits earlier hints have already
   *  ruled out there — see addExclusions. */
  excluded?: number[][]
}

/** Records an 'eliminate' hint's deduction into an `excluded` grid (returns a copy). */
export function addExclusions(excluded: number[][] | undefined, hint: { cells: Coord[]; digits: number[] }): number[][] {
  const next = excluded ? excluded.map((row) => row.slice()) : Array.from({ length: 9 }, () => new Array<number>(9).fill(0))
  const mask = hint.digits.reduce((m, d) => m | (1 << (d - 1)), 0)
  for (const p of hint.cells) next[p.row][p.col] |= mask
  return next
}

const FULL = 0x1ff
const BOX_NAMES = ['top-left', 'top-middle', 'top-right', 'middle-left', 'centre', 'middle-right', 'bottom-left', 'bottom-middle', 'bottom-right']

interface Unit {
  name: string
  cells: Coord[]
}

function rowUnit(r: number): Unit {
  return { name: `row ${r + 1}`, cells: Array.from({ length: 9 }, (_, c) => ({ row: r, col: c })) }
}
function colUnit(c: number): Unit {
  return { name: `column ${c + 1}`, cells: Array.from({ length: 9 }, (_, r) => ({ row: r, col: c })) }
}
function boxUnit(b: number): Unit {
  const r0 = Math.floor(b / 3) * 3
  const c0 = (b % 3) * 3
  const cells: Coord[] = []
  for (let r = r0; r < r0 + 3; r++) for (let c = c0; c < c0 + 3; c++) cells.push({ row: r, col: c })
  return { name: `the ${BOX_NAMES[b]} box`, cells }
}

const BOXES = Array.from({ length: 9 }, (_, i) => boxUnit(i))
const ROWS = Array.from({ length: 9 }, (_, i) => rowUnit(i))
const COLS = Array.from({ length: 9 }, (_, i) => colUnit(i))
const ALL_UNITS = [...BOXES, ...ROWS, ...COLS]

function digitsOf(mask: number): number[] {
  const out: number[] = []
  for (let d = 1; d <= 9; d++) if (mask & (1 << (d - 1))) out.push(d)
  return out
}

function bitCount(mask: number): number {
  let n = 0
  while (mask) {
    mask &= mask - 1
    n++
  }
  return n
}

/** "1, 4 and 9" */
function listDigits(digits: number[]): string {
  if (digits.length <= 1) return digits.join('')
  return `${digits.slice(0, -1).join(', ')} and ${digits[digits.length - 1]}`
}

function cageLabel(cage: Cage): string {
  return `this ${cage.cells.length}-square cage of ${cage.sum}`
}

export function findSudokuHint({ values, solution, cages, excluded }: HintInput): SudokuHint | null {
  const cageOf = cages ? cageIndexGrid(cages) : null

  // 1. Mistakes first.
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = values[r][c]
      if (v === 0 || v === solution[r][c]) continue
      const peers = [...rowUnit(r).cells, ...colUnit(c).cells, ...boxUnit(boxIndex(r, c)).cells]
      const clash = peers.find((p) => (p.row !== r || p.col !== c) && values[p.row][p.col] === v)
      let reason = "it doesn't fit with the rest of the puzzle. Clear it and look again."
      if (clash) {
        const where = clash.row === r ? 'this row' : clash.col === c ? 'this column' : 'this box'
        reason = `there's already a ${v} in ${where}.`
      } else if (cages && cageOf) {
        const cage = cages[cageOf[r][c]]
        if (cage.cells.some((p) => (p.row !== r || p.col !== c) && values[p.row][p.col] === v)) reason = `this cage already has a ${v}.`
      }
      return { kind: 'mistake', cell: { row: r, col: c }, message: `This ${v} is wrong — ${reason}`, focus: clash ? [clash] : [] }
    }
  }

  // Candidates from rows/columns/boxes, and cages for Killer.
  const used = (cells: Coord[]) => cells.reduce((m, p) => (values[p.row][p.col] ? m | (1 << (values[p.row][p.col] - 1)) : m), 0)
  const rowUsed = ROWS.map((u) => used(u.cells))
  const colUsed = COLS.map((u) => used(u.cells))
  const boxUsed = BOXES.map((u) => used(u.cells))
  const cageMask = cages
    ? cages.map((cage) => {
        const placed = cage.cells.map((p) => values[p.row][p.col]).filter((v) => v !== 0)
        return cageOptions(cage.sum, cage.cells.length - placed.length, placed)
      })
    : null

  const cand: number[][] = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      if (values[r][c] !== 0) return 0
      let m = FULL & ~(rowUsed[r] | colUsed[c] | boxUsed[boxIndex(r, c)])
      if (cageMask && cageOf) m &= cageMask[cageOf[r][c]]
      // Never let a stale exclusion rule out the real answer.
      if (excluded) m &= ~(excluded[r][c] & ~(1 << (solution[r][c] - 1)))
      return m
    }),
  )

  // 2. Killer: the last empty square of a cage.
  if (cages) {
    for (const cage of cages) {
      const empty = cage.cells.filter((p) => values[p.row][p.col] === 0)
      if (empty.length !== 1) continue
      const placedSum = cage.cells.reduce((s, p) => s + values[p.row][p.col], 0)
      const cell = empty[0]
      const digit = cage.sum - placedSum
      return {
        kind: 'place',
        cell,
        digit,
        message:
          cage.cells.length === 1
            ? `This square is a cage on its own, so it's simply its sum: ${digit}.`
            : `This cage adds up to ${cage.sum}. ${cage.cells.length === 2 ? 'Its other square already makes' : `Its other ${cage.cells.length - 1} squares already make`} ${placedSum}, so the last one is ${digit}.`,
        focus: cage.cells,
      }
    }

    // The 45 rule: every row, column and box holds 1-9, which adds up to 45.
    for (const rule of fortyFiveRules(cages, values)) {
      if (rule.empty.length !== 1) continue
      const cell = rule.empty[0]
      const digit = rule.remaining
      return {
        kind: 'place',
        cell,
        digit,
        // The lead already ends on the digit when this square is the only one involved.
        message: rule.lead.endsWith(` ${digit}.`) ? rule.lead : `${rule.lead} That makes this square ${digit}.`,
        focus: rule.focus,
      }
    }
  }

  // Digits ruled out at a square only by earlier hint steps (not by what's on the board).
  const earlierOnly = (r: number, c: number): number => {
    if (!excluded || values[r][c] !== 0) return 0
    let basic = FULL & ~(rowUsed[r] | colUsed[c] | boxUsed[boxIndex(r, c)])
    if (cageMask && cageOf) basic &= cageMask[cageOf[r][c]]
    return basic & ~cand[r][c]
  }

  const describeNaked = (cell: Coord, digit: number): string => {
    const { row: r, col: c } = cell
    const parts: string[] = []
    const inRow = digitsOf(rowUsed[r])
    const inCol = digitsOf(colUsed[c] & ~rowUsed[r])
    const inBox = digitsOf(boxUsed[boxIndex(r, c)] & ~rowUsed[r] & ~colUsed[c])
    if (inRow.length) parts.push(`the row has ${listDigits(inRow)}`)
    if (inCol.length) parts.push(`the column has ${listDigits(inCol)}`)
    if (inBox.length) parts.push(`the box has ${listDigits(inBox)}`)
    if (cages && cageOf && cageMask) {
      const cage = cages[cageOf[r][c]]
      const lineAndBox = rowUsed[r] | colUsed[c] | boxUsed[boxIndex(r, c)]
      const byCage = digitsOf(FULL & ~lineAndBox & ~cageMask[cageOf[r][c]] & ~(1 << (digit - 1)))
      if (byCage.length) parts.push(`${cageLabel(cage)} can't use ${listDigits(byCage)}`)
    }
    const byEarlier = digitsOf(earlierOnly(r, c) & ~(1 << (digit - 1)))
    if (byEarlier.length) parts.push(`earlier steps ruled out ${listDigits(byEarlier)}`)
    if (parts.length === 0) return `Only ${digit} fits here.`
    const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
    return `Only ${digit} fits here: ${joined}.`
  }

  const nakedFocus = (cell: Coord): Coord[] => {
    const peers = [...rowUnit(cell.row).cells, ...colUnit(cell.col).cells, ...boxUnit(boxIndex(cell.row, cell.col)).cells]
    const out = peers.filter((p) => values[p.row][p.col] !== 0)
    if (cages && cageOf) out.push(...cages[cageOf[cell.row][cell.col]].cells)
    return out
  }

  type Single = { cell: Coord; digit: number; unit?: Unit; cage?: Cage }
  const cageSingleMessage = (cage: Cage, d: number) =>
    `Every way to fill ${cageLabel(cage)} uses a ${d}, and this is the only square in the cage where ${d} can still go.`
  const findSingle = (): Single | null => {
    for (const unit of ALL_UNITS) {
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << (d - 1)
        if (unit.cells.some((p) => values[p.row][p.col] === d)) continue
        const spots = unit.cells.filter((p) => cand[p.row][p.col] & bit)
        if (spots.length === 1) return { cell: spots[0], digit: d, unit }
      }
    }
    if (cages) {
      for (const cage of cages) {
        const required = requiredDigits(cage, values, cand)
        for (const d of digitsOf(required)) {
          const spots = cage.cells.filter((p) => cand[p.row][p.col] & (1 << (d - 1)))
          if (spots.length === 1) return { cell: spots[0], digit: d, cage }
        }
      }
    }
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (bitCount(cand[r][c]) === 1) return { cell: { row: r, col: c }, digit: digitsOf(cand[r][c])[0] }
      }
    }
    return null
  }

  // 3 & 4. Singles straight off the board.
  const direct = findSingle()
  if (direct) {
    if (direct.cage) {
      return { kind: 'place', cell: direct.cell, digit: direct.digit, message: cageSingleMessage(direct.cage, direct.digit), focus: direct.cage.cells }
    }
    if (direct.unit) {
      const bit = 1 << (direct.digit - 1)
      const byEarlier = direct.unit.cells.some((p) => earlierOnly(p.row, p.col) & bit)
      return {
        kind: 'place',
        cell: direct.cell,
        digit: direct.digit,
        message: `In ${direct.unit.name}, ${direct.digit} can only go here — every other empty square there is ruled out by its row, column${cages ? ', box or cage' : ' or box'}${
          byEarlier ? ', or by an earlier step' : ''
        }.`,
        focus: direct.unit.cells,
      }
    }
    return { kind: 'place', cell: direct.cell, digit: direct.digit, message: describeNaked(direct.cell, direct.digit), focus: nakedFocus(direct.cell) }
  }

  // 5. No digit can be placed yet: the next step is a single elimination.
  const elim = nextElimination(cand, values, cages)
  if (elim) {
    const removed = elim.remove.reduce((m, p) => m | (cand[p.row][p.col] & elim.mask), 0)
    return { kind: 'eliminate', cells: elim.remove, digits: digitsOf(removed), message: elim.message, focus: elim.focus }
  }

  // 6. Out of explainable techniques — reveal the most constrained square, honestly.
  let best: Coord | null = null
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (values[r][c] !== 0) continue
      if (!best || bitCount(cand[r][c]) < bitCount(cand[best.row][best.col])) best = { row: r, col: c }
    }
  }
  if (!best) return null
  const options = digitsOf(cand[best.row][best.col])
  const digit = solution[best.row][best.col]
  return {
    kind: 'place',
    cell: best,
    digit,
    message: `This one needs a more advanced technique than the hint can walk through. ${
      options.length > 1 ? `This square can only be ${listDigits(options).replace(/ and /, ' or ')} — ` : ''
    }the answer is ${digit}.`,
    focus: [],
  }
}

interface Elimination {
  mask: number
  remove: Coord[]
  focus: Coord[]
  message: string
}

/** The first pointing / claiming / naked-pair elimination that removes something —
 *  plus, for Killer, cage-combination, 45-rule and locked-cage-digit eliminations. */
function nextElimination(cand: number[][], values: DigitGrid, cages?: Cage[]): Elimination | null {
  return (
    (cages && cageComboElimination(cand, values, cages)) ||
    lockedCandidates(cand) ||
    (cages && nextKillerElimination(cand, values, cages)) ||
    subsetElimination(cand) ||
    xWing(cand) ||
    xyWing(cand)
  )
}

function sees(a: Coord, b: Coord): boolean {
  if (a.row === b.row && a.col === b.col) return false
  return a.row === b.row || a.col === b.col || boxIndex(a.row, a.col) === boxIndex(b.row, b.col)
}

/** XY-wing: a square that's A or B, seeing one square that's A or C and another that's
 *  B or C — whichever the first one is, one of the other two ends up C. */
function xyWing(cand: number[][]): Elimination | null {
  const twos: Coord[] = []
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (bitCount(cand[r][c]) === 2) twos.push({ row: r, col: c })
  const m = (p: Coord) => cand[p.row][p.col]
  for (const pivot of twos) {
    const [a, b] = digitsOf(m(pivot))
    const bitA = 1 << (a - 1)
    const bitB = 1 << (b - 1)
    for (const p1 of twos) {
      if (!sees(pivot, p1) || !(m(p1) & bitA) || m(p1) & bitB) continue
      const cBit = m(p1) & ~bitA
      for (const p2 of twos) {
        if (p2 === p1 || !sees(pivot, p2) || m(p2) !== (bitB | cBit)) continue
        const remove: Coord[] = []
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const q = { row: r, col: c }
            if (cand[r][c] & cBit && sees(q, p1) && sees(q, p2) && !(r === pivot.row && c === pivot.col)) remove.push(q)
          }
        }
        if (remove.length === 0) continue
        const cDigit = digitsOf(cBit)[0]
        return {
          mask: cBit,
          remove,
          focus: [pivot, p1, p2],
          message: `Look at three squares: one that can only be ${a} or ${b}, and two it lines up with — one that's ${a} or ${cDigit}, one that's ${b} or ${cDigit}. If the first is ${a}, the ${a}-or-${cDigit} square must be ${cDigit}; if it's ${b}, the ${b}-or-${cDigit} square must be ${cDigit}. Either way one of them is ${cDigit}, so no square that lines up with both can be ${cDigit}.`,
        }
      }
    }
  }
  return null
}

/** Pointing and claiming. */
function lockedCandidates(cand: number[][]): Elimination | null {
  // Pointing: a digit confined to one row/column within a box clears it from the rest
  // of that row/column.
  for (let b = 0; b < 9; b++) {
    const box = BOXES[b]
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << (d - 1)
      const spots = box.cells.filter((p) => cand[p.row][p.col] & bit)
      if (spots.length < 2) continue
      for (const line of ['row', 'col'] as const) {
        const key = line === 'row' ? spots[0].row : spots[0].col
        if (!spots.every((p) => (line === 'row' ? p.row : p.col) === key)) continue
        const unit = line === 'row' ? ROWS[key] : COLS[key]
        const remove = unit.cells.filter((p) => boxIndex(p.row, p.col) !== b && cand[p.row][p.col] & bit)
        if (remove.length === 0) continue
        return {
          mask: bit,
          remove,
          focus: spots,
          message: `In ${box.name}, ${d} can only go in ${unit.name}, so no other square in ${unit.name} can be ${d}.`,
        }
      }
    }
  }

  // Claiming: a digit confined to one box within a row/column clears it from the rest
  // of that box.
  for (const unit of [...ROWS, ...COLS]) {
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << (d - 1)
      const spots = unit.cells.filter((p) => cand[p.row][p.col] & bit)
      if (spots.length < 2) continue
      const b = boxIndex(spots[0].row, spots[0].col)
      if (!spots.every((p) => boxIndex(p.row, p.col) === b)) continue
      const inUnit = new Set(unit.cells.map((p) => `${p.row},${p.col}`))
      const remove = BOXES[b].cells.filter((p) => !inUnit.has(`${p.row},${p.col}`) && cand[p.row][p.col] & bit)
      if (remove.length === 0) continue
      return {
        mask: bit,
        remove,
        focus: spots,
        message: `In ${unit.name}, ${d} can only go inside ${BOXES[b].name}, so the rest of that box can't be ${d}.`,
      }
    }
  }

  return null
}

/** Naked pairs, hidden pairs and naked triples. */
function subsetElimination(cand: number[][]): Elimination | null {
  // Naked pair: two squares in a unit that can only be the same two digits use both up.
  for (const unit of ALL_UNITS) {
    const pairs = unit.cells.filter((p) => bitCount(cand[p.row][p.col]) === 2)
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const m = cand[pairs[i].row][pairs[i].col]
        if (m !== cand[pairs[j].row][pairs[j].col]) continue
        const remove = unit.cells.filter((p) => p !== pairs[i] && p !== pairs[j] && cand[p.row][p.col] & m)
        if (remove.length === 0) continue
        const [a, bDigit] = digitsOf(m)
        return {
          mask: m,
          remove,
          focus: [pairs[i], pairs[j]],
          message: `Two squares in ${unit.name} can only be ${a} or ${bDigit}, so between them they'll use both — no other square in ${unit.name} can be ${a} or ${bDigit}.`,
        }
      }
    }
  }

  // Hidden pair: two digits that can each only go in the same two squares of a unit
  // take those squares, so nothing else can go in them.
  for (const unit of ALL_UNITS) {
    const spotsOf = (d: number) => unit.cells.filter((p) => cand[p.row][p.col] & (1 << (d - 1)))
    for (let a = 1; a <= 9; a++) {
      const sa = spotsOf(a)
      if (sa.length !== 2) continue
      for (let b = a + 1; b <= 9; b++) {
        const sb = spotsOf(b)
        if (sb.length !== 2 || sb[0] !== sa[0] || sb[1] !== sa[1]) continue
        const keep = (1 << (a - 1)) | (1 << (b - 1))
        const remove = sa.filter((p) => cand[p.row][p.col] & ~keep)
        if (remove.length === 0) continue
        return {
          mask: FULL & ~keep,
          remove,
          focus: unit.cells,
          message: `In ${unit.name}, ${a} and ${b} can each only go in the same two squares — so those two squares are ${a} and ${b} between them, and can't be anything else.`,
        }
      }
    }
  }

  // Naked triple: three squares in a unit whose options, together, are only three digits.
  for (const unit of ALL_UNITS) {
    const small = unit.cells.filter((p) => {
      const n = bitCount(cand[p.row][p.col])
      return n >= 2 && n <= 3
    })
    for (let i = 0; i < small.length; i++) {
      for (let j = i + 1; j < small.length; j++) {
        for (let k = j + 1; k < small.length; k++) {
          const trio = [small[i], small[j], small[k]]
          const m = trio.reduce((acc, p) => acc | cand[p.row][p.col], 0)
          if (bitCount(m) !== 3) continue
          const remove = unit.cells.filter((p) => !trio.includes(p) && cand[p.row][p.col] & m)
          if (remove.length === 0) continue
          const ds = digitsOf(m)
          return {
            mask: m,
            remove,
            focus: trio,
            message: `Three squares in ${unit.name} can only be ${listDigits(ds).replace(/ and /, ' or ')} between them, so they'll use up all three — no other square in ${unit.name} can be ${listDigits(ds).replace(/ and /, ' or ')}.`,
          }
        }
      }
    }
  }

  return null
}

/** X-wing: a digit confined to the same two columns in two rows (or the same two rows
 *  in two columns) must take one corner of that rectangle in each, so the rest of
 *  those columns (rows) can't have it. */
function xWing(cand: number[][]): Elimination | null {
  for (const [lines, cross, lineWord, crossWord] of [
    [ROWS, COLS, 'rows', 'columns'],
    [COLS, ROWS, 'columns', 'rows'],
  ] as const) {
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << (d - 1)
      const spots = lines.map((u) => u.cells.filter((p) => cand[p.row][p.col] & bit))
      const across = (p: Coord) => (lineWord === 'rows' ? p.col : p.row)
      for (let i = 0; i < 9; i++) {
        if (spots[i].length !== 2) continue
        for (let j = i + 1; j < 9; j++) {
          if (spots[j].length !== 2) continue
          const x = across(spots[i][0])
          const y = across(spots[i][1])
          if (across(spots[j][0]) !== x || across(spots[j][1]) !== y) continue
          const corners = [...spots[i], ...spots[j]]
          const remove = [...cross[x].cells, ...cross[y].cells].filter((p) => !corners.includes(p) && !corners.some((q) => q.row === p.row && q.col === p.col) && cand[p.row][p.col] & bit)
          if (remove.length === 0) continue
          return {
            mask: bit,
            remove,
            focus: corners,
            message: `In ${lines[i].name} and ${lines[j].name}, ${d} can only go in ${crossWord} ${x + 1} and ${y + 1}. Whichever way round it goes, those two ${crossWord} each get their ${d} from these ${lineWord} — so no other square in ${crossWord} ${x + 1} or ${y + 1} can be ${d}.`,
          }
        }
      }
    }
  }
  return null
}

/** Every combination (as a digit mask) that can still fill `cage`: distinct digits not
 *  already in it, summing to what's left, with each empty square able to take one of
 *  them and every digit fitting some empty square. */
function validCombos(cage: Cage, values: DigitGrid, cand: number[][]): number[] {
  const placed = cage.cells.map((p) => values[p.row][p.col]).filter((v) => v !== 0)
  const empty = cage.cells.filter((p) => values[p.row][p.col] === 0)
  if (empty.length === 0) return []
  const usedMask = placed.reduce((m, d) => m | (1 << (d - 1)), 0)
  const rest = cage.sum - placed.reduce((a, d) => a + d, 0)
  const reach = empty.reduce((m, p) => m | cand[p.row][p.col], 0)
  const out: number[] = []
  for (let m = 1; m <= FULL; m++) {
    if (bitCount(m) !== empty.length || m & usedMask || m & ~reach) continue
    if (digitsOf(m).reduce((a, d) => a + d, 0) !== rest) continue
    if (empty.some((p) => (cand[p.row][p.col] & m) === 0)) continue
    out.push(m)
  }
  return out
}

/** Digits every remaining valid combination of `cage` uses. */
function requiredDigits(cage: Cage, values: DigitGrid, cand: number[][]): number {
  const combos = validCombos(cage, values, cand)
  return combos.length ? combos.reduce((a, m) => a & m, FULL) : 0
}

function comboText(m: number): string {
  return digitsOf(m).join('+')
}

interface FortyFive {
  /** Explanation up to the conclusion, e.g. "Row 3 adds up to 45 ... so these 2 squares make 11." */
  lead: string
  empty: Coord[]
  /** What the empty squares must add up to. */
  remaining: number
  focus: Coord[]
}

interface Region {
  name: string
  cells: Coord[]
  total: number
}

/** Every row, column and box (45 each), plus runs of 2-3 neighbouring rows or columns
 *  (90 / 135) — the shapes the 45 rule is usually applied to. */
const REGIONS: Region[] = (() => {
  const out: Region[] = ALL_UNITS.map((u) => ({ name: u.name, cells: u.cells, total: 45 }))
  for (const [lines, word] of [
    [ROWS, 'rows'],
    [COLS, 'columns'],
  ] as const) {
    for (const k of [2, 3]) {
      for (let start = 0; start + k <= 9; start++) {
        const nums = Array.from({ length: k }, (_, i) => start + i + 1)
        out.push({
          name: `${word} ${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`,
          cells: nums.flatMap((n) => lines[n - 1].cells),
          total: 45 * k,
        })
      }
    }
  }
  return out
})()

/** 45-rule deductions: the cages lying wholly inside a region fix the total of its
 *  leftover squares ("innies"); the cages that touch it fix the total of the squares
 *  they spill outside it ("outies"). Only returns sets that are small and still have
 *  empty squares. */
function fortyFiveRules(cages: Cage[], values: DigitGrid): FortyFive[] {
  const out: FortyFive[] = []
  const owner = cageIndexGrid(cages)
  for (const region of REGIONS) {
    const inRegion = new Set(region.cells.map((p) => `${p.row},${p.col}`))
    const touching = [...new Set(region.cells.map((p) => owner[p.row][p.col]))].map((i) => cages[i])
    const inside = touching.filter((cage) => cage.cells.every((p) => inRegion.has(`${p.row},${p.col}`)))
    const insideSum = inside.reduce((a, cage) => a + cage.sum, 0)
    const insideCells = new Set(inside.flatMap((cage) => cage.cells.map((p) => `${p.row},${p.col}`)))
    const Name = region.name.charAt(0).toUpperCase() + region.name.slice(1)
    const addsUp = region.total === 45 ? `${Name} adds up to 45 (1 to 9)` : `${Name} add up to ${region.total} (45 each)`

    // Innies: region squares not covered by a fully-inside cage.
    const innies = region.cells.filter((p) => !insideCells.has(`${p.row},${p.col}`))
    if (innies.length > 0 && innies.length <= 5 && inside.length > 0) {
      const placed = innies.filter((p) => values[p.row][p.col] !== 0)
      const empty = innies.filter((p) => values[p.row][p.col] === 0)
      const total = region.total - insideSum
      const remaining = total - placed.reduce((a, p) => a + values[p.row][p.col], 0)
      if (empty.length > 0) {
        out.push({
          lead: `${addsUp}. The cages sitting entirely inside make ${insideSum}, so the ${innies.length === 1 ? 'one square left over is' : `${innies.length} squares left over add up to`} ${total}${
            placed.length ? `, and with the ${placed.length === 1 ? 'one' : 'ones'} already filled that leaves ${remaining}` : ''
          }.`,
          empty,
          remaining,
          focus: region.cells,
        })
      }
    }

    // Outies: squares of touching cages that spill outside the region.
    const touchingSum = touching.reduce((a, cage) => a + cage.sum, 0)
    const outies = touching.flatMap((cage) => cage.cells).filter((p) => !inRegion.has(`${p.row},${p.col}`))
    if (outies.length > 0 && outies.length <= 4) {
      const placed = outies.filter((p) => values[p.row][p.col] !== 0)
      const empty = outies.filter((p) => values[p.row][p.col] === 0)
      const total = touchingSum - region.total
      const remaining = total - placed.reduce((a, p) => a + values[p.row][p.col], 0)
      if (empty.length > 0) {
        out.push({
          lead: `${addsUp}. The cages that touch ${region.total === 45 ? 'it' : 'them'} add up to ${touchingSum}, so the ${outies.length === 1 ? 'one square they spill' : `${outies.length} squares they spill`} outside ${
            outies.length === 1 ? 'is' : 'add up to'
          } ${total}${placed.length ? `, and with the ${placed.length === 1 ? 'one' : 'ones'} already filled that leaves ${remaining}` : ''}.`,
          empty,
          remaining,
          focus: touching.flatMap((cage) => cage.cells),
        })
      }
    }
  }
  return out
}

/** Every way to fill `cells` with digits they can still hold, adding up to `total` —
 *  squares that share a row, column, box or cage can't repeat a digit. Returns, per
 *  square, the digits that appear in some way, plus the distinct digit sets used. */
function fitSum(cells: Coord[], total: number, cand: number[][], owner: number[][]): { possible: number[]; combos: string[] } | null {
  const n = cells.length
  if (n === 0 || n > 6) return null
  const clash = (a: Coord, b: Coord) =>
    a.row === b.row || a.col === b.col || boxIndex(a.row, a.col) === boxIndex(b.row, b.col) || owner[a.row][a.col] === owner[b.row][b.col]
  const possible = new Array<number>(n).fill(0)
  const combos = new Set<string>()
  const pick: number[] = []
  const dfs = (i: number, left: number) => {
    if (i === n) {
      if (left !== 0) return
      pick.forEach((d, k) => (possible[k] |= 1 << (d - 1)))
      combos.add([...pick].sort((x, y) => x - y).join('+'))
      return
    }
    const rest = n - i - 1
    for (const d of digitsOf(cand[cells[i].row][cells[i].col])) {
      if (d > left - rest) break
      if (left - d > 9 * rest) continue
      if (pick.some((e, k) => e === d && clash(cells[k], cells[i]))) continue
      pick.push(d)
      dfs(i + 1, left - d)
      pick.pop()
    }
  }
  dfs(0, total)
  return { possible, combos: [...combos] }
}

/** The first digit some of `cells` can't take in any way of making `total` — one digit
 *  per step, so each hint stays a single thing to cross off. */
function sumGroupElimination(
  cells: Coord[],
  total: number,
  cand: number[][],
  owner: number[][],
  explain: (combos: string, d: number, count: number) => string,
  focus: Coord[],
): Elimination | null {
  const fit = fitSum(cells, total, cand, owner)
  if (!fit || fit.combos.length === 0) return null
  for (let d = 1; d <= 9; d++) {
    const bit = 1 << (d - 1)
    const remove = cells.filter((p, i) => cand[p.row][p.col] & bit && !(fit.possible[i] & bit))
    if (remove.length === 0) continue
    const shown = fit.combos.slice(0, 3).join(' or ') + (fit.combos.length > 3 ? ' (and others)' : '')
    return { mask: bit, remove, focus, message: explain(shown, d, remove.length) }
  }
  return null
}

/** Cage combinations: digits that appear in no combination that still fits. */
function cageComboElimination(cand: number[][], values: DigitGrid, cages: Cage[]): Elimination | null {
  for (const cage of cages) {
    const combos = validCombos(cage, values, cand)
    if (combos.length === 0) continue
    const allowed = combos.reduce((a, m) => a | m, 0)
    const remove = cage.cells.filter((p) => values[p.row][p.col] === 0 && cand[p.row][p.col] & ~allowed)
    if (remove.length === 0) continue
    const removed = digitsOf(remove.reduce((m, p) => m | (cand[p.row][p.col] & ~allowed), 0))
    const shown = combos.slice(0, 3).map(comboText).join(' or ') + (combos.length > 3 ? ' (and others)' : '')
    return {
      mask: FULL & ~allowed,
      remove,
      focus: cage.cells,
      message: `The only ways to fill ${cageLabel(cage)} that still fit are ${shown}, so ${listDigits(removed)} can't go in it.`,
    }
  }
  return null
}

function nextKillerElimination(cand: number[][], values: DigitGrid, cages: Cage[]): Elimination | null {
  // Locked cage digits: a digit every combination uses must go in the cage; if every
  // square of the cage that could take it lies in one row/column/box, nothing else in
  // that unit can be it.
  for (const cage of cages) {
    const required = requiredDigits(cage, values, cand)
    if (!required) continue
    const inCage = new Set(cage.cells.map((p) => `${p.row},${p.col}`))
    for (const d of digitsOf(required)) {
      const bit = 1 << (d - 1)
      if (cage.cells.some((p) => values[p.row][p.col] === d)) continue
      const spots = cage.cells.filter((p) => cand[p.row][p.col] & bit)
      for (const unit of ALL_UNITS) {
        const unitKeys = new Set(unit.cells.map((p) => `${p.row},${p.col}`))
        if (!spots.every((p) => unitKeys.has(`${p.row},${p.col}`))) continue
        const remove = unit.cells.filter((p) => !inCage.has(`${p.row},${p.col}`) && cand[p.row][p.col] & bit)
        if (remove.length === 0) continue
        const whole = cage.cells.every((p) => unitKeys.has(`${p.row},${p.col}`))
        return {
          mask: bit,
          remove,
          focus: whole ? cage.cells : spots,
          message: whole
            ? `Every way to fill ${cageLabel(cage)} uses a ${d}, and the cage sits inside ${unit.name} — so no other square in ${unit.name} can be ${d}.`
            : `Every way to fill ${cageLabel(cage)} uses a ${d}, and the only squares of it that can take the ${d} are in ${unit.name} — so no other square in ${unit.name} can be ${d}.`,
        }
      }
    }
  }

  // A unit that forces a digit into a cage: if a row/column/box can only put its d in
  // squares of one cage, that cage must use a d — ruling out every combination without one.
  for (const unit of ALL_UNITS) {
    for (let d = 1; d <= 9; d++) {
      const bit = 1 << (d - 1)
      if (unit.cells.some((p) => values[p.row][p.col] === d)) continue
      const spots = unit.cells.filter((p) => cand[p.row][p.col] & bit)
      if (spots.length === 0) continue
      const owner = cageIndexGrid(cages)
      const ci = owner[spots[0].row][spots[0].col]
      if (!spots.every((p) => owner[p.row][p.col] === ci)) continue
      const cage = cages[ci]
      const combos = validCombos(cage, values, cand)
      const withD = combos.filter((m) => m & bit)
      if (withD.length === 0 || withD.length === combos.length) continue
      const allowed = withD.reduce((a, m) => a | m, 0)
      const remove = cage.cells.filter((p) => values[p.row][p.col] === 0 && cand[p.row][p.col] & ~allowed)
      if (remove.length === 0) continue
      const removed = digitsOf(remove.reduce((m, p) => m | (cand[p.row][p.col] & ~allowed), 0))
      const shown = withD.slice(0, 3).map(comboText).join(' or ') + (withD.length > 3 ? ' (and others)' : '')
      return {
        mask: FULL & ~allowed,
        remove,
        focus: [...spots, ...cage.cells],
        message: `In ${unit.name}, ${d} can only go in squares of ${cageLabel(cage)}, so the cage must use a ${d}. That leaves ${shown}, so ${listDigits(removed)} can't go in it.`,
      }
    }
  }

  const owner = cageIndexGrid(cages)
  const which = (count: number) => (count === 1 ? 'the highlighted square' : `the ${count} highlighted squares`)

  // Fitting each cage's combinations into what its squares can still hold.
  for (const cage of cages) {
    const empty = cage.cells.filter((p) => values[p.row][p.col] === 0)
    if (empty.length < 2) continue
    const rest = cage.sum - cage.cells.reduce((a, p) => a + values[p.row][p.col], 0)
    const elim = sumGroupElimination(
      empty,
      rest,
      cand,
      owner,
      (shown, d, count) =>
        `The only ways to fill ${cageLabel(cage)} that still fit are ${shown}. Matching those against what each square can still hold, ${which(count)} can't be ${d}.`,
      cage.cells,
    )
    if (elim) return elim
  }

  // 45 rule: leftover squares with a known total act like an extra cage.
  for (const rule of fortyFiveRules(cages, values)) {
    if (rule.empty.length < 2) continue
    const elim = sumGroupElimination(
      rule.empty,
      rule.remaining,
      cand,
      owner,
      (shown, d, count) => `${rule.lead} The only ways to make that with what those squares can still hold are ${shown}, so ${which(count)} can't be ${d}.`,
      [...rule.focus, ...rule.empty],
    )
    if (elim) return elim
  }
  return null
}
