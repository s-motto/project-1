import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import '../src/styles/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// Registrazione del service worker per funzionalità PWA 
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        // Registration successful
        console.log('ServiceWorker registration successful with scope: ', registration.scope)
      })
      .catch((err) => {
        console.warn('ServiceWorker registration failed: ', err)
      })
  })
}
