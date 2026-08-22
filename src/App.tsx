import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
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
import { UpdateToast } from './components/UpdateToast'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/queens" element={<DifficultyPage />} />
        <Route path="/queens/:difficulty" element={<GamePage />} />
        <Route path="/queens/:difficulty/complete" element={<CompletePage />} />
        <Route path="/sudoku" element={<SudokuDifficultyPage />} />
        <Route path="/sudoku/:difficulty" element={<SudokuGamePage />} />
        <Route path="/sudoku/:difficulty/complete" element={<SudokuCompletePage />} />
        <Route path="/zip" element={<ZipDifficultyPage />} />
        <Route path="/zip/:difficulty" element={<ZipGamePage />} />
        <Route path="/zip/:difficulty/complete" element={<ZipCompletePage />} />
        <Route path="/patches" element={<PatchesDifficultyPage />} />
        <Route path="/patches/:difficulty" element={<PatchesGamePage />} />
        <Route path="/patches/:difficulty/complete" element={<PatchesCompletePage />} />
      </Routes>
      <UpdateToast />
    </BrowserRouter>
  )
}

export default App
