import { useCallback, useMemo, useState } from 'react'

interface Coord {
  row: number
  col: number
}

/** 'step': a "Show next step" deduction the player now makes themselves — its target
 *  squares are highlighted gold. 'fix': squares that are wrong (a hint's "mistake" or
 *  "Check my work") — highlighted red. */
export type HintTone = 'step' | 'fix'

export interface ShowHintArgs<S> {
  /** Small heading on the card, e.g. "Next step". */
  label: string
  message: string
  tone: HintTone
  /** Squares the reasoning refers to — outlined gold. */
  focus?: Coord[]
  /** coordKeys of the squares the player still has to change for this hint to be
   *  done, given the current game state. The card stays up until this is empty. */
  pending: (state: S) => Iterable<string>
}

interface Shown<S> {
  label: string
  message: string
  tone: HintTone
  focus: Set<string>
  pending: (state: S) => Iterable<string>
}

export interface HintExplanationView {
  label: string
  message: string
  tone: HintTone
  /** Squares the reasoning refers to (minus the targets) — outlined gold. */
  focus: Set<string>
  /** Squares the player still has to fill or fix. */
  targets: Set<string>
}

/** State for the hint card (see HintExplanation). Hints never change the board
 *  themselves: the card explains the move, highlights the squares to fill (or fix), and
 *  stays until the player has made it — each target drops off as it's done, and the
 *  card goes away once none are left (or on "Hide"). */
export function useHintExplanation<S>(state: S) {
  const [shown, setShown] = useState<Shown<S> | null>(null)

  const targets = useMemo(() => (shown ? new Set(shown.pending(state)) : null), [shown, state])
  // Adjusting state during render (React's documented alternative to an effect for
  // this): the player just finished the hint's move.
  if (shown && targets && targets.size === 0) setShown(null)

  const explanation = useMemo<HintExplanationView | null>(() => {
    if (!shown || !targets || targets.size === 0) return null
    const focus = new Set([...shown.focus].filter((k) => !targets.has(k)))
    return { label: shown.label, message: shown.message, tone: shown.tone, focus, targets }
  }, [shown, targets])

  const show = useCallback((args: ShowHintArgs<S>) => {
    setShown({
      label: args.label,
      message: args.message,
      tone: args.tone,
      focus: new Set((args.focus ?? []).map((p) => `${p.row},${p.col}`)),
      pending: args.pending,
    })
  }, [])
  const dismiss = useCallback(() => setShown(null), [])

  return { explanation, show, dismiss }
}

/** coordKeys of `cells` for which `done` is false — the usual shape of a `pending`. */
export function keysWhere(cells: Coord[], notDone: (p: Coord) => boolean): string[] {
  return cells.filter(notDone).map((p) => `${p.row},${p.col}`)
}

/** `pending` for a "Check my work" result: the squares it flagged that are still wrong
 *  (each one drops off as soon as the player changes it to something right, or clears it). */
export function stillWrong<S>(flagged: Set<string>, getWrong: (state: S) => Set<string>) {
  return (state: S) => {
    const wrong = getWrong(state)
    return [...flagged].filter((k) => wrong.has(k))
  }
}

/** Board highlight props for an explanation: gold reasoning outline, plus either gold
 *  targets (a step to make) or red flags (squares to fix). */
export function hintHighlights(explanation: HintExplanationView | null) {
  return {
    focusCells: explanation?.focus,
    targetCells: explanation?.tone === 'step' ? explanation.targets : undefined,
    flaggedCells: explanation?.tone === 'fix' ? explanation.targets : undefined,
  }
}
