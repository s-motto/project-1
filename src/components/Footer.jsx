import React from 'react'

const Footer = () => {
  return (
    <footer className="text-center py-4 text-sm text-gray-600">
      Powered by{' '}
      <a href="https://openrouteservice.org/" className="text-blue-600 hover:underline">
        OpenRouteService
      </a>
      {' '}e{' '}
      <a href="https://www.openstreetmap.org/" className="text-blue-600 hover:underline">
        OpenStreetMap
      </a>
    </footer>
  )
}

export default Footer