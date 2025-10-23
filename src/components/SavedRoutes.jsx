import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRoute, faTrash, faMapMarkedAlt, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import routesService from '../routesService'

const SavedRoutes = ({ onLoadRoute }) => {
  const { user } = useAuth()
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (user) {
      loadRoutes()
    }
  }, [user])

  const loadRoutes = async () => {
    setLoading(true)
    const result = await routesService.getUserRoutes(user.$id)
    if (result.success) {
      setRoutes(result.data)
    }
    setLoading(false)
  }

  const handleDelete = async (routeId) => {
    if (!confirm('Sei sicuro di voler eliminare questo percorso?')) return
    
    setDeleting(routeId)
    const result = await routesService.deleteRoute(routeId)
    if (result.success) {
      setRoutes(routes.filter(r => r.$id !== routeId))
    } else {
      alert('Errore durante l\'eliminazione: ' + result.error)
    }
    setDeleting(null)
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-gray-600">Effettua il login per vedere i tuoi percorsi salvati</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-600" />
        <p className="mt-2 text-gray-600">Caricamento percorsi...</p>
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <FontAwesomeIcon icon={faRoute} className="text-4xl text-gray-300 mb-3" />
        <p className="text-gray-600">Non hai ancora salvato nessun percorso</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-xl">
      <h3 className="text-lg font-bold mb-4 text-gray-800">I tuoi percorsi salvati</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {routes.map(route => (
          <div
            key={route.$id}
            className="border rounded-lg p-3 hover:bg-gray-50 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-gray-800">{route.name}</h4>
                <div className="text-xs text-gray-500 mt-1 space-y-1">
                  <p>📍 {route.startPoint.name?.substring(0, 50)}...</p>
                  <p>🏁 {route.endPoint.name?.substring(0, 50)}...</p>
                  <div className="flex space-x-3 mt-2">
                    <span>📏 {route.distance} km</span>
                    <span>⏱️ {route.duration} min</span>
                    <span>⛰️ {route.ascent} m</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col space-y-2 ml-3">
                <button
                  onClick={() => onLoadRoute(route)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Carica percorso"
                >
                  <FontAwesomeIcon icon={faMapMarkedAlt} />
                </button>
                <button
                  onClick={() => handleDelete(route.$id)}
                  disabled={deleting === route.$id}
                  className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                  title="Elimina percorso"
                >
                  {deleting === route.$id ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faTrash} />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SavedRoutes