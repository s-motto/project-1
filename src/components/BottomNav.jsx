
import React from 'react'
import { FaHome, FaRoute, FaBookmark, FaInfoCircle } from 'react-icons/fa'
import InfoModal from './InfoModal'
import { useState } from 'react'
import NearbyHikes from './NearbyHikes'

const BottomNav = ({ onHomeClick, onSavedClick, onRouteSelected }) => { 
  const [showInfo, setShowInfo] = useState(false)
  const [showNearbyHikes, setShowNearbyHikes] = useState(false)

  const handleSelectHike = (hike) => {
    setShowNearbyHikes(false)
    if (onRouteSelected) {
      onRouteSelected(hike)
    }
  }

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
          onClose={() => setShowNearbyHikes(false)} 
          onSelectHike={handleSelectHike} 
        />
      )}
    </>
  )
}

export default BottomNav