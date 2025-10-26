
import React from 'react'
import { FaHome, FaRoute, FaBookmark, FaCog } from 'react-icons/fa'

const BottomNav = ({ onHomeClick, onSavedClick }) => {

  const focusRouteStart = () => {
    const startInput = document.querySelector('input[placeholder="Punto di partenza"]')
    if (startInput) {
      startInput.focus()
      startInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  
  const openSettings = () => alert('Settings placeholder — implement settings or profile actions here.')

  return (
    <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg rounded-xl px-4 py-2 flex items-center gap-6 z-40">
      <button onClick={onHomeClick} aria-label="Home" className="flex flex-col items-center text-sm text-gray-700 hover:text-blue-600">
        <FaHome className="text-lg" />
        <span className="text-[10px]">Home</span>
      </button>
      <button onClick={focusRouteStart} aria-label="Route" className="flex flex-col items-center text-sm text-gray-700 hover:text-blue-600">
        <FaRoute className="text-lg" />
        <span className="text-[10px]">Route</span>
      </button>
     <button onClick={onSavedClick} aria-label="Saved" className="flex flex-col items-center text-sm text-gray-700 hover:text-blue-600">
  <FaBookmark className="text-lg" />
  <span className="text-[10px]">Saved</span>
</button>
      <button onClick={openSettings} aria-label="More" className="flex flex-col items-center text-sm text-gray-700 hover:text-blue-600">
        <FaCog className="text-lg" />
        <span className="text-[10px]">More</span>
      </button>
    </nav>
  )
}

export default BottomNav
