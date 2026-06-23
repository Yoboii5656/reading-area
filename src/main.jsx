import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'

// Register service worker with auto-update
registerSW({
  onNeedRefresh() {
    // Auto-update when new version is available
    if (confirm('New version available. Reload to update?')) {
      window.location.reload()
    }
  },
  onOfflineReady() {
    console.log('App ready for offline use')
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
