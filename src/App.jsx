import { useState, useRef, lazy, Suspense } from 'react'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import BottomNav from './components/BottomNav'
import UserMenu from './components/UserMenu'
import ToastContainer from './components/ToastContainer'
import { useToast } from './contexts/ToastContext'

// LAZY LOADING dei componenti pesanti
const RouteSearchForm = lazy(() => import('./components/RouteSearchForm'))
const SavedRoutes = lazy(() => import('./components/SavedRoutes'))

// Componente di caricamento
const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
  </div>
)

// Componente principale App
function App() {
  const [showSaved, setShowSaved] = useState(false)
  const [preloadedRoute, setPreloadedRoute] = useState(null)
  const [preloadedHike, setPreloadedHike] = useState(null)
  const routeFormRef = useRef()
  const { toast } = useToast()

  // Gestori eventi per la navigazione
  const handleHomeClick = () => {
    setShowSaved(false)
    setPreloadedRoute(null)
    setPreloadedHike(null)
    if (routeFormRef.current?.reset) {
      routeFormRef.current.reset()
    }
  }

  // Mostra le rotte salvate
  const handleSavedClick = () => {
    setShowSaved(true)
    setPreloadedRoute(null)
    setPreloadedHike(null)
  }

  // Carica una rotta salvata
  const handleLoadRoute = (route) => {
    setPreloadedRoute(route)
    setPreloadedHike(null)
    setShowSaved(false)
  }

  // Carica un percorso di hiking selezionato
  const handleRouteSelected = (hike) => {
    setPreloadedHike(hike)
    setPreloadedRoute(null)
    setShowSaved(false)
  }

  // Render del componente
  return (
    <AuthProvider>
      <ToastContainer />
       
      <div className="page-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-container">
            <div className="logo-container">
              <div className="logo-icon">
                🚶
              </div>
              <div className="logo-text-container">
                <h1 className="logo-title">Let's Walk!</h1>
                <p className="logo-subtitle">Ciao! Dove andiamo oggi?</p>
              </div>
            </div>
            <UserMenu onShowSavedRoutes={handleSavedClick} />
          </div>
        </header>

        {/* Main Content con Suspense per lazy loading */}
        <main className="content-wrapper">
          <Suspense fallback={<LoadingSpinner />}>
            {showSaved ? (
              <SavedRoutes onLoadRoute={handleLoadRoute} />
            ) : (
              <RouteSearchForm
                ref={routeFormRef}
                preloadedRoute={preloadedRoute}
                preloadedHike={preloadedHike}
              />
            )}
          </Suspense>
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          onHomeClick={handleHomeClick}
          onSavedClick={handleSavedClick}
          onRouteSelected={handleRouteSelected}
        />
      </div>
    </AuthProvider>
  )
}

export default App