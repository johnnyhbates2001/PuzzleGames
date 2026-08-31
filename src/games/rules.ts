export interface GameRules {
  steps: string[]
  tip?: string
}

/** Keyed by GameDefinition.id (see registry.ts) — one entry per playable game. */
export const GAME_RULES: Record<string, GameRules> = {
  queens: {
    steps: [
      'Place exactly one queen in every row, every column, and every colored region.',
      'No two queens may touch, including diagonally.',
      'Tap a cell to cycle it empty → X → queen → empty, or drag across cells to mark several X’s at once.',
    ],
    tip: 'Turn on Auto X in Settings to automatically X out cells a placed queen rules out.',
  },
  sudoku: {
    steps: [
      'Fill every row, every column, and every 3×3 box with the digits 1 through 9.',
      'No digit may repeat within a row, column, or box.',
      'Select a cell, then a number, to fill it. Toggle notes mode to jot down candidates instead of a final answer.',
    ],
  },
  zip: {
    steps: [
      'Draw one continuous line that visits every numbered checkpoint in order, 1 through the last.',
      'The line must pass through every cell on the board exactly once — no cell skipped, none visited twice.',
      'Drag across cells to draw the line; drag back over your own path to erase.',
    ],
  },
  patches: {
    steps: [
      'Every number is a clue sitting in one corner of a hidden rectangle.',
      'Drag from a clue to its opposite corner to draw a rectangle matching that clue’s exact area and shape (square, tall, or wide).',
      'Rectangles may never overlap, and together they must cover the entire board.',
    ],
  },
  nonogram: {
    steps: [
      'The numbers beside each row and column give the length of every run of filled cells in that line, in order, with at least one empty cell between runs.',
      'Fill in the cells that match every row and column’s clues; everything else stays empty.',
      'Tap or drag across cells to mark them — the ✕ button switches between filling cells and X-marking ones you know are empty.',
    ],
    tip: 'Marking cells you know are empty with an X is optional, but it helps track your logic on bigger boards.',
  },
  wordle: {
    steps: [
      'Guess the hidden 5-letter word. Type a real word and submit to see how close you are.',
      'A green letter is correct and in the right spot. A yellow letter is in the word but the wrong spot. A gray letter isn’t in the word at all.',
      'Use what you learn each guess to narrow it down before you run out of attempts.',
    ],
    tip: 'Hard tier turns on Hard Mode: every green and yellow letter you’ve found must be used in your next guess.',
  },
}
