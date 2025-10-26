
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

  const focusRouteStart = () => {
    const startInput = document.querySelector('input[placeholder="Punto di partenza"]')
    if (startInput) {
      startInput.focus()
      startInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  
  

  return (
    <>
    <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg rounded-xl px-4 py-2 flex items-center gap-6 z-40">
      <button onClick={onHomeClick} aria-label="Home" className="flex flex-col items-center text-sm text-gray-700 hover:text-blue-600">
        <FaHome className="text-lg" />
        <span className="text-[10px]">Home</span>
      </button>
      <button onClick={() => setShowNearbyHikes(true)} aria-label="Route" className="flex flex-col items-center text-sm text-gray-700 hover:text-blue-600">
        <FaRoute className="text-lg" />
        <span className="text-[10px]">Route</span>
      </button>
     <button onClick={onSavedClick} aria-label="Saved" className="flex flex-col items-center text-sm text-gray-700 hover:text-blue-600">
  <FaBookmark className="text-lg" />
  <span className="text-[10px]">Saved</span>
</button>
      <button onClick={() => setShowInfo(true)} aria-label="Info" className="flex flex-col items-center text-sm text-gray-700 hover:text-blue-600">
  <FaInfoCircle className="text-lg" />
  <span className="text-[10px]">Info</span>
</button>
 </nav>
    {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      {showNearbyHikes && <NearbyHikes onClose={() => setShowNearbyHikes(false)} onSelectHike={handleSelectHike} />}
  </>
   
  )
}

export default BottomNav
