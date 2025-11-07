
import React from 'react' // importo React
import { FaHome, FaRoute, FaBookmark, FaInfoCircle } from 'react-icons/fa'  // importo le icone necessarie
import InfoModal from './InfoModal' // importo il componente InfoModal
import { useState } from 'react'  // importo l'hook useState
import NearbyHikes from './NearbyHikes' // importo il componente NearbyHikes

// Componente BottomNav per la navigazione inferiore
const BottomNav = ({ onHomeClick, onSavedClick, onRouteSelected }) => { 
  const [showInfo, setShowInfo] = useState(false)
  const [showNearbyHikes, setShowNearbyHikes] = useState(false)
  // Gestore della selezione di un percorso di hiking
  const handleSelectHike = (hike) => {
    setShowNearbyHikes(false)
    if (onRouteSelected) {
      onRouteSelected(hike)
    }
  }
 // Render del componente
  return (
    <>
      <nav className="bottom-nav">
        <button 
          onClick={onHomeClick} 
          aria-label="Home" 
          className="nav-item"
        >
          <FaHome className="text-lg" />
          <span className="nav-item-label">Home</span>
        </button>

        <button 
          onClick={() => setShowNearbyHikes(true)} 
          aria-label="Route" 
          className="nav-item"
        >
          <FaRoute className="text-lg" />
          <span className="nav-item-label">Route</span>
        </button>

        <button 
          onClick={onSavedClick} 
          aria-label="Saved" 
          className="nav-item"
        >
          <FaBookmark className="text-lg" />
          <span className="nav-item-label">Saved</span>
        </button>

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
          onClose={() => setShowNearbyHikes(false)} // Chiusura del modal
          onSelectHike={handleSelectHike} // Selezione di un percorso di hiking
        />
      )}
    </>
  )
}

export default BottomNav