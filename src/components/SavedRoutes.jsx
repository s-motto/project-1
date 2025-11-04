import React, { useState, useEffect } from 'react'
import { FaRoute, FaTrash, FaMapMarkedAlt, FaSpinner, FaCheckCircle, FaPlay } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import routesService from '../services/routesService'
import ActiveTracking from './ActiveTracking'
import { useToast } from '../contexts/ToastContext'

const SavedRoutes = ({ onLoadRoute }) => {
  const { user } = useAuth()
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [activeRoute, setActiveRoute] = useState(null) // Percorso in tracking
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      loadRoutes()
    }
  }, [user])

  const loadRoutes = async () => {
    setLoading(true)
    const result = await routesService.getSavedRoutes(user.$id)
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
      toast.error('Errore durante l\'eliminazione: ' + result.error)
    }
    setDeleting(null)
  }

  // Segna come completato (senza tracking GPS)
  const handleComplete = async (routeId) => {
    if (!confirm('Vuoi segnare questo percorso come completato? I dati pianificati verranno copiati nelle statistiche.')) return
    
    setCompleting(routeId)
    const result = await routesService.completeRoute(routeId)
    if (result.success) {
      setRoutes(routes.filter(r => r.$id !== routeId))
      toast.success('✅ Percorso segnato come completato! Controlla la Dashboard per le statistiche.')
    } else {
      toast.error('Errore durante il completamento: ' + result.error)
    }
    setCompleting(null)
  }

  // Avvia tracking GPS
  const handleStartTracking = (route) => {
    setActiveRoute(route)
  }

  // Chiudi tracking
  const handleCloseTracking = () => {
    setActiveRoute(null)
  }

  // Tracking completato
  const handleTrackingComplete = () => {
    loadRoutes() // Ricarica la lista
    setActiveRoute(null)
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
        <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto" />
        <p className="mt-2 text-gray-600">Caricamento percorsi...</p>
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <FaRoute className="text-4xl text-gray-300 mb-3 mx-auto" />
        <p className="text-gray-600">Non hai ancora salvato nessun percorso</p>
      </div>
    )
  }

  return (
    <>
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
                  {/* Bottone Inizia tracking GPS */}
                  <button
                    onClick={() => handleStartTracking(route)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Inizia percorso con tracking GPS"
                  >
                    <FaPlay className="text-lg" />
                  </button>
                  
                  {/* Bottone Carica sulla mappa */}
                  <button
                    onClick={() => onLoadRoute(route)}
                    className="text-indigo-600 hover:text-indigo-800 p-1"
                    title="Visualizza percorso sulla mappa"
                  >
                    <FaMapMarkedAlt className="text-lg" />
                  </button>
                  
                  {/* Bottone Segna come completato (senza GPS) */}
                  <button
                    onClick={() => handleComplete(route.$id)}
                    disabled={completing === route.$id}
                    className="text-green-600 hover:text-green-800 disabled:text-gray-400 p-1"
                    title="Segna come completato (senza GPS)"
                  >
                    {completing === route.$id ? (
                      <FaSpinner className="animate-spin text-lg" />
                    ) : (
                      <FaCheckCircle className="text-lg" />
                    )}
                  </button>
                  
                  {/* Bottone Elimina */}
                  <button
                    onClick={() => handleDelete(route.$id)}
                    disabled={deleting === route.$id}
                    className="text-red-600 hover:text-red-800 disabled:text-gray-400 p-1"
                    title="Elimina percorso"
                  >
                    {deleting === route.$id ? (
                      <FaSpinner className="animate-spin text-lg" />
                    ) : (
                       <FaTrash className="text-lg" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Tracking GPS */}
      {activeRoute && (
        <ActiveTracking
          route={activeRoute}
          onClose={handleCloseTracking}
          onComplete={handleTrackingComplete}
        />
      )}
    </>
  )
}

export default SavedRoutes