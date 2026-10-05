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
 *  5. If neither exists, it applies the next layer of eliminations (pointing, claiming,
 *     naked pairs) one at a time until a single appears, and explains both parts.
 *  6. Failing all that (some hard puzzles need techniques beyond these), it reveals the
 *     most-constrained square and says so honestly.
 */

export type SudokuHint =
  | { kind: 'mistake'; cell: Coord; message: string; focus: Coord[] }
  | { kind: 'place'; cell: Coord; digit: number; message: string; focus: Coord[] }

interface HintInput {
  values: DigitGrid
  solution: DigitGrid
  cages?: Cage[]
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

export function findSudokuHint({ values, solution, cages }: HintInput): SudokuHint | null {
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
      return {
        kind: 'place',
        cell: direct.cell,
        digit: direct.digit,
        message: `In ${direct.unit.name}, ${direct.digit} can only go here — every other empty square there is ruled out by its row, column${cages ? ', box or cage' : ' or box'}.`,
        focus: direct.unit.cells,
      }
    }
    return { kind: 'place', cell: direct.cell, digit: direct.digit, message: describeNaked(direct.cell, direct.digit), focus: nakedFocus(direct.cell) }
  }

  // 5. One more layer of eliminations, applied one at a time until a single appears.
  const steps: string[] = []
  const stepFocus: Coord[] = []
  for (let guard = 0; guard < 60; guard++) {
    const elim = nextElimination(cand, values, cages)
    if (!elim) break
    for (const p of elim.remove) cand[p.row][p.col] &= ~elim.mask
    steps.push(elim.message)
    stepFocus.push(...elim.focus)
    const single = findSingle()
    if (!single) continue
    const lead = steps.length <= 2 ? steps.join(' ') : `After a few eliminations — the last one being: ${steps[steps.length - 1].charAt(0).toLowerCase()}${steps[steps.length - 1].slice(1)}`
    const tail = single.cage
      ? `That leaves this as the only square in ${cageLabel(single.cage)} for the ${single.digit} it needs.`
      : single.unit
        ? `That leaves only one place for ${single.digit} in ${single.unit.name}.`
        : `That leaves ${single.digit} as the only digit that fits here.`
    return {
      kind: 'place',
      cell: single.cell,
      digit: single.digit,
      message: `${lead} ${tail}`,
      focus: [...stepFocus, ...(single.unit ? single.unit.cells : single.cage ? single.cage.cells : [])],
    }
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
  if (cages) {
    const killer = nextKillerElimination(cand, values, cages)
    if (killer) return killer
  }

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

/** 45-rule deductions for every row, column and box: the cages lying wholly inside the
 *  unit fix the total of its leftover squares ("innies"); the cages that touch it fix
 *  the total of the squares they spill outside it ("outies"). Only returns sets that
 *  are small and still have empty squares. */
function fortyFiveRules(cages: Cage[], values: DigitGrid): FortyFive[] {
  const out: FortyFive[] = []
  const owner = cageIndexGrid(cages)
  for (const unit of ALL_UNITS) {
    const inUnit = new Set(unit.cells.map((p) => `${p.row},${p.col}`))
    const touching = [...new Set(unit.cells.map((p) => owner[p.row][p.col]))].map((i) => cages[i])
    const inside = touching.filter((cage) => cage.cells.every((p) => inUnit.has(`${p.row},${p.col}`)))
    const insideSum = inside.reduce((a, cage) => a + cage.sum, 0)
    const insideCells = new Set(inside.flatMap((cage) => cage.cells.map((p) => `${p.row},${p.col}`)))
    const Unit = unit.name.charAt(0).toUpperCase() + unit.name.slice(1)

    // Innies: unit squares not covered by a fully-inside cage.
    const innies = unit.cells.filter((p) => !insideCells.has(`${p.row},${p.col}`))
    if (innies.length > 0 && innies.length <= 4 && inside.length > 0) {
      const placed = innies.filter((p) => values[p.row][p.col] !== 0)
      const empty = innies.filter((p) => values[p.row][p.col] === 0)
      const total = 45 - insideSum
      const remaining = total - placed.reduce((a, p) => a + values[p.row][p.col], 0)
      if (empty.length > 0) {
        out.push({
          lead: `${Unit} adds up to 45 (1 to 9). The cages sitting entirely inside it make ${insideSum}, so the ${innies.length === 1 ? 'one square left over is' : `${innies.length} squares left over add up to`} ${total}${
            placed.length ? `, and with the ${placed.length === 1 ? 'one' : 'ones'} already filled that leaves ${remaining}` : ''
          }.`,
          empty,
          remaining,
          focus: unit.cells,
        })
      }
    }

    // Outies: squares of touching cages that spill outside the unit.
    const touchingSum = touching.reduce((a, cage) => a + cage.sum, 0)
    const outies = touching.flatMap((cage) => cage.cells).filter((p) => !inUnit.has(`${p.row},${p.col}`))
    if (outies.length > 0 && outies.length <= 3) {
      const placed = outies.filter((p) => values[p.row][p.col] !== 0)
      const empty = outies.filter((p) => values[p.row][p.col] === 0)
      const total = touchingSum - 45
      const remaining = total - placed.reduce((a, p) => a + values[p.row][p.col], 0)
      if (empty.length > 0) {
        out.push({
          lead: `${Unit} adds up to 45. The cages that touch it add up to ${touchingSum}, so the ${outies.length === 1 ? 'one square they spill' : `${outies.length} squares they spill`} outside it ${
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

function nextKillerElimination(cand: number[][], values: DigitGrid, cages: Cage[]): Elimination | null {
  // Cage combinations: digits that appear in no combination that still fits.
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

  // Locked cage digits: a digit every combination uses, in a cage lying within one
  // row/column/box, can't appear anywhere else in that unit.
  for (const cage of cages) {
    const required = requiredDigits(cage, values, cand)
    if (!required) continue
    const inCage = new Set(cage.cells.map((p) => `${p.row},${p.col}`))
    for (const unit of ALL_UNITS) {
      const unitKeys = new Set(unit.cells.map((p) => `${p.row},${p.col}`))
      if (!cage.cells.every((p) => unitKeys.has(`${p.row},${p.col}`))) continue
      for (const d of digitsOf(required)) {
        const bit = 1 << (d - 1)
        if (cage.cells.some((p) => values[p.row][p.col] === d)) continue
        const remove = unit.cells.filter((p) => !inCage.has(`${p.row},${p.col}`) && cand[p.row][p.col] & bit)
        if (remove.length === 0) continue
        return {
          mask: bit,
          remove,
          focus: cage.cells,
          message: `Every way to fill ${cageLabel(cage)} uses a ${d}, and the cage sits inside ${unit.name} — so no other square in ${unit.name} can be ${d}.`,
        }
      }
    }
  }

  // 45 rule: leftover squares with a known total act like an extra cage.
  for (const rule of fortyFiveRules(cages, values)) {
    if (rule.empty.length < 2) continue
    const unitOf = (p: Coord) => [`r${p.row}`, `c${p.col}`, `b${boxIndex(p.row, p.col)}`]
    const shared = unitOf(rule.empty[0]).filter((u) => rule.empty.every((p) => unitOf(p).includes(u)))
    // The digits can only be treated as distinct when the squares share a unit.
    const virtual: Cage = { cells: rule.empty, sum: rule.remaining }
    const combos = shared.length ? validCombos(virtual, values, cand) : []
    if (combos.length === 0) continue
    const allowed = combos.reduce((a, m) => a | m, 0)
    const remove = rule.empty.filter((p) => cand[p.row][p.col] & ~allowed)
    if (remove.length === 0) continue
    const removed = digitsOf(remove.reduce((m, p) => m | (cand[p.row][p.col] & ~allowed), 0))
    return {
      mask: FULL & ~allowed,
      remove,
      focus: [...rule.focus, ...rule.empty],
      message: `${rule.lead} Those squares can't hold ${listDigits(removed)}.`,
    }
  }
  return null
}
