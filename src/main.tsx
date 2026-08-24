import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

void navigator.storage?.persist?.()

// Sensible default so a navigation that bypasses AppLink/useAppNavigate — a direct
// deep link, or a browser back/forward gesture — never animates with a stale or
// missing direction (see navDirection.ts).
document.documentElement.dataset.nav = 'forward'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
