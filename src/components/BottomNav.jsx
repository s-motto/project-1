
import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaRoute, FaBookmark, FaInfoCircle } from 'react-icons/fa'
import InfoModal from './InfoModal'
import NearbyHikes from './NearbyHikes'
import { useNavigate } from 'react-router-dom'

// Componente BottomNav con React Router
const BottomNav = () => {
  const [showInfo, setShowInfo] = useState(false)
  const [showNearbyHikes, setShowNearbyHikes] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Controlla se un path è attivo
  const isActive = (path) => location.pathname === path

  // Gestore selezione hike
  const handleSelectHike = (hike) => {
    setShowNearbyHikes(false)
    // Naviga alla home e passa hike tramite state
    navigate('/', { state: { preloadedHike: hike } })
  }

  return (
    <>
      <nav className="bottom-nav">
        {/* Home */}
        <Link 
          to="/" 
          aria-label="Home" 
          className={`nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <FaHome className="text-lg" />
          <span className="nav-item-label">Home</span>
        </Link>

        {/* Route (modal) */}
        <button 
          onClick={() => setShowNearbyHikes(true)} 
          aria-label="Route" 
          className="nav-item"
        >
          <FaRoute className="text-lg" />
          <span className="nav-item-label">Route</span>
        </button>

        {/* Saved */}
        <Link 
          to="/saved" 
          aria-label="Saved" 
          className={`nav-item ${isActive('/saved') ? 'active' : ''}`}
        >
          <FaBookmark className="text-lg" />
          <span className="nav-item-label">Saved</span>
        </Link>

        {/* Info */}
        <button 
          onClick={() => setShowInfo(true)} 
          aria-label="Info" 
          className="nav-item"
        >
          <FaInfoCircle className="text-lg" />
          <span className="nav-item-label">Info</span>
        </button>
      </nav>
      
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      {showNearbyHikes && (
        <NearbyHikes 
          onClose={() => setShowNearbyHikes(false)}
          onSelectHike={handleSelectHike}
        />
      )}
    </>
  )
}

export default BottomNav