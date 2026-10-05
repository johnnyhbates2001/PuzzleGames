import { useCallback, useState } from 'react'

interface Coord {
  row: number
  col: number
}

interface Explanation {
  message: string
  /** coordKeys the reasoning refers to — outlined on the board. */
  focus: Set<string>
  /** True between showing a hint and its own board change landing, so that change
   *  doesn't count as "the player moved on". */
  awaitingOwnMove: boolean
}

/** State for a "Show next step" hint's explanation (see HintExplanation): shown when the
 *  hint fires, and cleared by "Got it" or by the next change to `board` that isn't the
 *  hint's own move — so it never lingers once the player has moved on. */
export function useHintExplanation(board: unknown) {
  const [explanation, setExplanation] = useState<Explanation | null>(null)
  const [prevBoard, setPrevBoard] = useState(board)

  // Adjusting state on a prop change during render (React's documented alternative to
  // an effect for this) — `board` is a fresh reference on every reducer change.
  if (board !== prevBoard) {
    setPrevBoard(board)
    if (explanation) setExplanation(explanation.awaitingOwnMove ? { ...explanation, awaitingOwnMove: false } : null)
  }

  /** `changesBoard`: whether the hint is about to apply a move of its own. */
  const show = useCallback((message: string, focus: Coord[], changesBoard: boolean) => {
    setExplanation({ message, focus: new Set(focus.map((p) => `${p.row},${p.col}`)), awaitingOwnMove: changesBoard })
  }, [])
  const dismiss = useCallback(() => setExplanation(null), [])

  return { explanation, show, dismiss }
}
