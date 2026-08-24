import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import StatsPage from './pages/StatsPage'
import AwardsPage from './pages/AwardsPage'
import DifficultyPage from './pages/DifficultyPage'
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
import ErrorPage from './pages/ErrorPage'
import { ScrollReset } from './components/ScrollReset'
import { UpdateToast } from './components/UpdateToast'
import { SkinProvider } from './hooks/useSkin'
import { AudioProvider } from './hooks/useAudio'

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
      { path: 'queens/:difficulty', element: <GamePage /> },
      { path: 'queens/:difficulty/complete', element: <CompletePage /> },
      { path: 'sudoku', element: <SudokuDifficultyPage /> },
      { path: 'sudoku/:difficulty', element: <SudokuGamePage /> },
      { path: 'sudoku/:difficulty/complete', element: <SudokuCompletePage /> },
      { path: 'zip', element: <ZipDifficultyPage /> },
      { path: 'zip/:difficulty', element: <ZipGamePage /> },
      { path: 'zip/:difficulty/complete', element: <ZipCompletePage /> },
      { path: 'patches', element: <PatchesDifficultyPage /> },
      { path: 'patches/:difficulty', element: <PatchesGamePage /> },
      { path: 'patches/:difficulty/complete', element: <PatchesCompletePage /> },
      { path: 'nonogram', element: <NonogramDifficultyPage /> },
      { path: 'nonogram/:difficulty', element: <NonogramGamePage /> },
      { path: 'nonogram/:difficulty/complete', element: <NonogramCompletePage /> },
    ],
  },
])

function App() {
  return (
    <SkinProvider>
      <AudioProvider>
        <RouterProvider router={router} />
      </AudioProvider>
    </SkinProvider>
  )
}

export default App
