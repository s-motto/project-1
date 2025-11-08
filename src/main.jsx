import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import { NavigationProvider } from './contexts/NavigationContext'
import '../src/styles/index.css'
import App from './App.jsx'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
import { ToastProvider } from './contexts/ToastContext'
import { SettingsProvider } from './contexts/SettingsContext'
import logger from './utils/logger'

// Resetto il tema di default
if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('theme-dark')
  document.body.classList.remove('modal-open')
}

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <SettingsProvider>
        <AuthProvider>
          <NavigationProvider>
            <App />
          </NavigationProvider>
        </AuthProvider>
      </SettingsProvider>
    </ToastProvider>
  </StrictMode>,
)

// Registrazione del service worker per funzionalità PWA 
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        // Registration successful
        logger.log('ServiceWorker registration successful with scope: ', registration.scope)
      })
      .catch((err) => {
        logger.warn('ServiceWorker registration failed: ', err)
      })
  })
}
