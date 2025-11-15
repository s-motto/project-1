import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import BottomNav from './components/BottomNav'
import UserMenu from './components/UserMenu'
import ToastContainer from './components/ToastContainer'

// LAZY LOADING dei componenti pesanti
const RouteSearchForm = lazy(() => import('./components/RouteSearchForm'))
const SavedRoutes = lazy(() => import('./components/SavedRoutes'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const Achievements = lazy(() => import('./components/Achievements'))
const NearbyHikes = lazy(() => import('./components/NearbyHikes'))

// Componente di caricamento
const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
  </div>
)

// Componente principale App con routing
function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      
      <div className="page-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-container">
            <div className="logo-container cursor-pointer" onClick={() => window.location.href = '/'}>
              <div className="logo-icon">🚶</div>
              <div className="logo-text-container">
                <h1 className="logo-title">Let's Walk!</h1>
                <p className="logo-subtitle">Ciao! Dove andiamo oggi?</p>
              </div>
            </div>
            <UserMenu />
          </div>
        </header>

        {/* Main Content con Routes */}
        <main className="content-wrapper">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Home - Ricerca percorsi */}
              <Route path="/" element={<RouteSearchForm />} />
              
              {/* Percorsi salvati */}
              <Route path="/saved" element={<SavedRoutes />} />
              
              {/* Dashboard statistiche */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Achievements */}
              <Route path="/achievements" element={<Achievements />} />
              
              {/* Sentieri vicini */}
              <Route path="/nearby" element={<NearbyHikes />} />
              
              {/* Redirect percorsi non trovati */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default App