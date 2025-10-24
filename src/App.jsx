import React, { useState } from 'react'
import BottomNav from './components/BottomNav'
import RouteSearchForm from './components/RouteSearchForm'
import Footer from './components/Footer'
import UserMenu from './components/UserMenu'
import SavedRoutes from './components/SavedRoutes'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from './contexts/AuthContext'

const App = () => {
  const { user } = useAuth()
  const [showSavedRoutes, setShowSavedRoutes] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState(null)

  const handleLoadRoute = (route) => {
    setSelectedRoute(route)
    setShowSavedRoutes(false)
    // Scroll to route form
    document.querySelector('#route-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header con UserMenu */}
      <header id="top" className="header-bg tracking-wide font-bold font-display flex flex-col items-center justify-center min-h-[45vh] sm:min-h-[50vh] relative">
        {/* User menu in alto a destra */}
        <div className="absolute top-4 right-4 z-10">
          <UserMenu onShowSavedRoutes={() => setShowSavedRoutes(!showSavedRoutes)} />
        </div>

        <div className="header-content w-full flex flex-col items-center justify-center px-4 py-6">
          <h1 className="text-4xl sm:text-6xl text-center pt-4 sm:pt-8 text-white drop-shadow-lg font-captivating">
            Let's Walk!
          </h1>
          <h2 className="text-xl sm:text-4xl text-center pb-4 sm:pb-8 text-white drop-shadow font-captivating font-bold">
            {user ? `Ciao ${user.name}!` : 'Benvenuto!'} <FontAwesomeIcon icon={faMusic} /> Dove vai oggi?
          </h2>
        </div>
      </header>

      {/* Main content */}
      <section id="route-section" className="flex-1 flex flex-col items-center justify-start w-full px-2 sm:px-0 py-4 sm:py-8 pb-24">
        <div className="w-full max-w-md sm:max-w-xl space-y-4">
          {/* Mostra percorsi salvati se richiesto */}
          {showSavedRoutes ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Percorsi Salvati</h2>
                <button
                  onClick={() => setShowSavedRoutes(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Torna alla ricerca
                </button>
              </div>
              <SavedRoutes onLoadRoute={handleLoadRoute} />
            </>
          ) : (
            <RouteSearchForm preloadedRoute={selectedRoute} />
          )}
        </div>
      </section>

      <Footer />
      <BottomNav />
    </main>
  )
}

export default App