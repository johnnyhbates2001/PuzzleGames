repo: johnnyhbates2001/PuzzleGames
branch: main

## Last sync
date: 2026-08-30T17:39:24Z
commit: 5bb99e7affe8

### Updated in this project
- Read src/index.css motion layer; authored a full motion system (Puzzles Motion System.dc.html) covering page transitions, per-game gameplay feel, feedback and completion.
- 4 existing keyframes kept as-is, 9 revised, 14 new; dropped zip-stub-in and skin-flip.
- Zip + Patches boards revised (continuous stroke + tinted trail; shape-carrying clue badges).
- Prior sync notes:
- Repo has shipped the whole design-pass-2 spec: accents, coins, hint sheet, skin shop, stats.
- Repo has since gone further than our mockups: 17 skins (chapter-reward tier), a 5th game (Nonogram), chapters/awards, audio, daily challenge, endless mode.
- Design mockups (Puzzles Design v2) are now behind the code — worth a refresh pass if we design again.

## Screen map
| Project screen | Repo files |
| --- | --- |
| App icon set (icons/) | public/icons/, scripts/generate-icons.ts |
| Home (Puzzles) | src/pages/HomePage.tsx, src/games/registry.ts, src/components/*GridPreview.tsx |
| Difficulty | src/pages/DifficultyPage.tsx (+ Sudoku/Zip/Patches/Nonogram variants) |
| Game | src/pages/GamePage.tsx, src/components/Board.tsx, src/components/Cell.tsx |
| Complete modal | src/pages/CompletePage.tsx (+ per-game variants), src/components/CompleteSheet.tsx |
| Design tokens | src/index.css |
| Design pass 2 (accents, Sudoku/Zip/Patches, coins, shop, stats, motion) | src/components/SudokuBoard.tsx, SudokuCell.tsx, SudokuKeypad.tsx, ZipBoard.tsx, ZipCell.tsx, PatchesBoard.tsx, PatchesCell.tsx, src/index.css |
| Coins + hints (shipped) | src/components/CoinBalance.tsx, HintSheet.tsx, src/hooks/useGameCompletion.ts |
| Shop + skins (shipped) | src/pages/ShopPage.tsx, src/skins.ts, src/hooks/useSkin.tsx |
| Stats / awards (shipped) | src/pages/StatsPage.tsx, AwardsPage.tsx, src/achievements/definitions.ts |
| Motion system (all animations) | src/index.css (motion block), src/hooks/useAppNavigate.ts, src/components/TabBar.tsx, Board.tsx, Confetti.tsx, CompleteSheet.tsx |
| Not yet designed | src/pages/*ChaptersPage.tsx, src/games/chapters.ts, src/games/dailyChallenge.ts, src/components/EndlessCard.tsx, FailSheet.tsx, SettingsButton.tsx, src/components/Nonogram*.tsx |

## Sync history
- 2026-08-22T17:53:31Z — design pass 2 authored (accents, per-game screens, coins, shop, stats, motion). No commit sha recorded.
