export interface GameDefinition {
  id: string
  title: string
  description: string
  /** Route to the game's difficulty-select page. */
  route: string
}

export const GAMES: GameDefinition[] = [
  {
    id: 'queens',
    title: 'Queens',
    description: 'Place one queen in every row, column, and colored region — none may touch.',
    route: '/queens',
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    description: 'Fill every row, column, and 3×3 box with the digits 1 through 9.',
    route: '/sudoku',
  },
  {
    id: 'zip',
    title: 'Zip',
    description: 'Connect the dots in order with one line that fills every cell.',
    route: '/zip',
  },
  {
    id: 'patches',
    title: 'Patches',
    description: 'Draw a rectangle from every clue, sized and shaped to match it.',
    route: '/patches',
  },
  {
    id: 'nonogram',
    title: 'Nonogram',
    description: 'Fill cells to match the row and column clues and reveal the picture.',
    route: '/nonogram',
  },
  {
    id: 'wordle',
    title: 'Wordle',
    description: 'Guess the hidden word — every guess tells you which letters are right.',
    route: '/wordle',
  },
]
