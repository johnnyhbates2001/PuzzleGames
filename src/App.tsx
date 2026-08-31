import { useCallback, useState } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import StatsPage from './pages/StatsPage'
import AwardsPage from './pages/AwardsPage'
import DifficultyPage from './pages/DifficultyPage'
import ChaptersPage from './pages/ChaptersPage'
import GamePage from './pages/GamePage'
import CompletePage from './pages/CompletePage'
import SudokuDifficultyPage from './pages/SudokuDifficultyPage'
import SudokuGamePage from './pages/SudokuGamePage'
import SudokuCompletePage from './pages/SudokuCompletePage'
import ZipDifficultyPage from './pages/ZipDifficultyPage'
import ZipGamePage from './pages/ZipGamePage'
import ZipCompletePage from './pages/ZipCompletePage'
import PatchesDifficultyPage from './pages/PatchesDifficultyPage'
import PatchesGamePage from './pages/PatchesGamePage'
import PatchesCompletePage from './pages/PatchesCompletePage'
import NonogramDifficultyPage from './pages/NonogramDifficultyPage'
import NonogramGamePage from './pages/NonogramGamePage'
import NonogramCompletePage from './pages/NonogramCompletePage'
import WordleDifficultyPage from './pages/WordleDifficultyPage'
import WordleGamePage from './pages/WordleGamePage'
import WordleCompletePage from './pages/WordleCompletePage'
import ErrorPage from './pages/ErrorPage'
import { ScrollReset } from './components/ScrollReset'
import { UpdateToast } from './components/UpdateToast'
import { SplashScreen } from './components/SplashScreen'
import { SkinProvider } from './hooks/useSkin'
import { AudioProvider } from './hooks/useAudio'
import { CosmeticsProvider } from './hooks/useCosmetics'
import { AccentThemeEffect } from './components/AccentThemeEffect'

const SPLASH_SEEN_KEY = 'splashShown'

function RootLayout() {
  return (
    <>
      <ScrollReset />
      <UpdateToast />
      <Outlet />
    </>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'achievements', element: <AwardsPage /> },
      { path: 'queens', element: <DifficultyPage /> },
      { path: 'queens/chapters', element: <ChaptersPage gameId="queens" /> },
      { path: 'queens/free/:difficulty', element: <GamePage freePlay /> },
      { path: 'queens/free/:difficulty/complete', element: <CompletePage freePlay /> },
      { path: 'queens/:difficulty', element: <GamePage /> },
      { path: 'queens/:difficulty/complete', element: <CompletePage /> },
      { path: 'sudoku', element: <SudokuDifficultyPage /> },
      { path: 'sudoku/chapters', element: <ChaptersPage gameId="sudoku" /> },
      { path: 'sudoku/free/:difficulty', element: <SudokuGamePage freePlay /> },
      { path: 'sudoku/free/:difficulty/complete', element: <SudokuCompletePage freePlay /> },
      { path: 'sudoku/:difficulty', element: <SudokuGamePage /> },
      { path: 'sudoku/:difficulty/complete', element: <SudokuCompletePage /> },
      { path: 'zip', element: <ZipDifficultyPage /> },
      { path: 'zip/chapters', element: <ChaptersPage gameId="zip" /> },
      { path: 'zip/free/:difficulty', element: <ZipGamePage freePlay /> },
      { path: 'zip/free/:difficulty/complete', element: <ZipCompletePage freePlay /> },
      { path: 'zip/:difficulty', element: <ZipGamePage /> },
      { path: 'zip/:difficulty/complete', element: <ZipCompletePage /> },
      { path: 'patches', element: <PatchesDifficultyPage /> },
      { path: 'patches/chapters', element: <ChaptersPage gameId="patches" /> },
      { path: 'patches/free/:difficulty', element: <PatchesGamePage freePlay /> },
      { path: 'patches/free/:difficulty/complete', element: <PatchesCompletePage freePlay /> },
      { path: 'patches/:difficulty', element: <PatchesGamePage /> },
      { path: 'patches/:difficulty/complete', element: <PatchesCompletePage /> },
      { path: 'nonogram', element: <NonogramDifficultyPage /> },
      { path: 'nonogram/chapters', element: <ChaptersPage gameId="nonogram" /> },
      { path: 'nonogram/free/:difficulty', element: <NonogramGamePage freePlay /> },
      { path: 'nonogram/free/:difficulty/complete', element: <NonogramCompletePage freePlay /> },
      { path: 'nonogram/:difficulty', element: <NonogramGamePage /> },
      { path: 'nonogram/:difficulty/complete', element: <NonogramCompletePage /> },
      { path: 'wordle', element: <WordleDifficultyPage /> },
      { path: 'wordle/chapters', element: <ChaptersPage gameId="wordle" /> },
      { path: 'wordle/free/:difficulty', element: <WordleGamePage freePlay /> },
      { path: 'wordle/free/:difficulty/complete', element: <WordleCompletePage freePlay /> },
      { path: 'wordle/:difficulty', element: <WordleGamePage /> },
      { path: 'wordle/:difficulty/complete', element: <WordleCompletePage /> },
    ],
  },
])

function App() {
  // sessionStorage (not localStorage) so the splash reappears on the next cold
  // launch/tab, but never again mid-session from an in-app navigation.
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_SEEN_KEY) !== '1'
    } catch {
      return true
    }
  })

  const dismissSplash = useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1')
    } catch {
      // ignore
    }
    setShowSplash(false)
  }, [])

  return (
    <SkinProvider>
      <CosmeticsProvider>
        <AudioProvider>
          <AccentThemeEffect />
          {showSplash && <SplashScreen onDone={dismissSplash} />}
          <RouterProvider router={router} />
        </AudioProvider>
      </CosmeticsProvider>
    </SkinProvider>
  )
}

export default App
