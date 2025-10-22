
import React from 'react'
import roadSigns from '../assets/road-signs.svg'
import Search from './Search'

const Navbar = () => {
  return (
    <nav className="w-full flex items-center justify-between px-2 py-1 bg-white/80 shadow-sm border-b border-gray-200">
      <img src={roadSigns} alt="road signs" className="h-7 w-7 mr-2" />
      <div className="flex gap-3 text-xs sm:text-sm font-medium">
        <a href="#" className="text-gray-700 hover:text-blue-600 transition">Dashboard</a>
        <a href="#" className="text-gray-700 hover:text-blue-600 transition">Team</a>
        <a href="#" className="text-gray-700 hover:text-blue-600 transition">Projects</a>
        <a href="#" className="text-gray-700 hover:text-blue-600 transition">Calendar</a>
      </div>
    </nav>
  )
}

export default Navbar