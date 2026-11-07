import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import RiverPwaApp from './components/RiverPwaApp.jsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-app.js', { scope: '/app' }).catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RiverPwaApp />
  </StrictMode>,
)
