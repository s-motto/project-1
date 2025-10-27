import { useState, useRef, lazy, Suspense } from 'react'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import BottomNav from './components/BottomNav'
import UserMenu from './components/UserMenu'

// LAZY LOADING dei componenti pesanti
const RouteSearchForm = lazy(() => import('./components/RouteSearchForm'))
const SavedRoutes = lazy(() => import('./components/SavedRoutes'))

// Componente di caricamento
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)
// Componente principale App
function App() {
  const [showSaved, setShowSaved] = useState(false)
  const [preloadedRoute, setPreloadedRoute] = useState(null)
  const [preloadedHike, setPreloadedHike] = useState(null)
  const routeFormRef = useRef()
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
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                🚶
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Let's Walk!</h1>
                <p className="text-xs text-gray-500">Pianifica i tuoi percorsi</p>
              </div>
            </div>
            <UserMenu onShowSavedRoutes={handleSavedClick} />
          </div>
        </header>

        {/* Main Content con Suspense per lazy loading */}
        <main className="max-w-7xl mx-auto px-4 py-6">
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