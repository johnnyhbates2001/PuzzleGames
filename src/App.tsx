import { useCallback, useState } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import StatsPage from './pages/StatsPage'
import AwardsPage from './pages/AwardsPage'
import DifficultyPage from './pages/DifficultyPage'
import QueensChaptersPage from './pages/QueensChaptersPage'
import GamePage from './pages/GamePage'
import CompletePage from './pages/CompletePage'
import SudokuDifficultyPage from './pages/SudokuDifficultyPage'
import SudokuChaptersPage from './pages/SudokuChaptersPage'
import SudokuGamePage from './pages/SudokuGamePage'
import SudokuCompletePage from './pages/SudokuCompletePage'
import ZipDifficultyPage from './pages/ZipDifficultyPage'
import ZipChaptersPage from './pages/ZipChaptersPage'
import ZipGamePage from './pages/ZipGamePage'
import ZipCompletePage from './pages/ZipCompletePage'
import PatchesDifficultyPage from './pages/PatchesDifficultyPage'
import PatchesChaptersPage from './pages/PatchesChaptersPage'
import PatchesGamePage from './pages/PatchesGamePage'
import PatchesCompletePage from './pages/PatchesCompletePage'
import NonogramDifficultyPage from './pages/NonogramDifficultyPage'
import NonogramChaptersPage from './pages/NonogramChaptersPage'
import NonogramGamePage from './pages/NonogramGamePage'
import NonogramCompletePage from './pages/NonogramCompletePage'
import ErrorPage from './pages/ErrorPage'
import { ScrollReset } from './components/ScrollReset'
import { UpdateToast } from './components/UpdateToast'
import { SplashScreen } from './components/SplashScreen'
import { SkinProvider } from './hooks/useSkin'
import { AudioProvider } from './hooks/useAudio'

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
      { path: 'queens/chapters', element: <QueensChaptersPage /> },
      { path: 'queens/:difficulty', element: <GamePage /> },
      { path: 'queens/:difficulty/complete', element: <CompletePage /> },
      { path: 'sudoku', element: <SudokuDifficultyPage /> },
      { path: 'sudoku/chapters', element: <SudokuChaptersPage /> },
      { path: 'sudoku/:difficulty', element: <SudokuGamePage /> },
      { path: 'sudoku/:difficulty/complete', element: <SudokuCompletePage /> },
      { path: 'zip', element: <ZipDifficultyPage /> },
      { path: 'zip/chapters', element: <ZipChaptersPage /> },
      { path: 'zip/:difficulty', element: <ZipGamePage /> },
      { path: 'zip/:difficulty/complete', element: <ZipCompletePage /> },
      { path: 'patches', element: <PatchesDifficultyPage /> },
      { path: 'patches/chapters', element: <PatchesChaptersPage /> },
      { path: 'patches/:difficulty', element: <PatchesGamePage /> },
      { path: 'patches/:difficulty/complete', element: <PatchesCompletePage /> },
      { path: 'nonogram', element: <NonogramDifficultyPage /> },
      { path: 'nonogram/chapters', element: <NonogramChaptersPage /> },
      { path: 'nonogram/:difficulty', element: <NonogramGamePage /> },
      { path: 'nonogram/:difficulty/complete', element: <NonogramCompletePage /> },
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
      <AudioProvider>
        {showSplash && <SplashScreen onDone={dismissSplash} />}
        <RouterProvider router={router} />
      </AudioProvider>
    </SkinProvider>
  )
}

export default App
