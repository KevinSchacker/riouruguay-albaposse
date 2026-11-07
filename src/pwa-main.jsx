import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import RiverPwaApp from './components/RiverPwaApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RiverPwaApp />
  </StrictMode>,
)
