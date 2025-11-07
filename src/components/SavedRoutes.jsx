import React, { useState, useEffect } from 'react'
import { FaRoute, FaTrash, FaMapMarkedAlt, FaSpinner, FaCheckCircle, FaPlay, FaEdit, FaCheck, FaTimes } from 'react-icons/fa'

import { useAuth } from '../contexts/AuthContext'
import routesService from '../services/routesService'
import ActiveTracking from './ActiveTracking'
import { useToast } from '../contexts/ToastContext'
import { useSettings } from '../contexts/SettingsContext'
import { formatDistance, formatElevation, formatDurationMinutes, formatTimestamp } from '../utils/gpsUtils'

const SavedRoutes = ({ onLoadRoute }) => {
  const { user } = useAuth()
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [activeRoute, setActiveRoute] = useState(null) // Percorso in tracking
  const [editingId, setEditingId] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [savingNameId, setSavingNameId] = useState(null)

  const { toast } = useToast()
  const { settings } = useSettings()

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
      toast.success('Percorso eliminato')
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

  // Inizia rinomina
  const startRename = (route) => {
    setEditingId(route.$id)
    setNameDraft(route.name || '')
  }

  // Annulla rinomina
  const cancelRename = () => {
    setEditingId(null)
    setNameDraft('')
  }

  // Salva nuovo nome
  const saveRename = async (routeId) => {
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      toast.error('Il nome non può essere vuoto')
      return
    }
    setSavingNameId(routeId)
    const res = await routesService.updateRouteName(routeId, trimmed)
    if (res.success) {
      setRoutes(prev => prev.map(r => r.$id === routeId ? { ...r, name: trimmed } : r))
      toast.success('Nome aggiornato')
      setEditingId(null)
      setNameDraft('')
    } else {
      toast.error('Errore durante la rinomina: ' + res.error)
    }
    setSavingNameId(null)
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

  // Stati di caricamento e vuoti
  if (!user) {
    return (
      <div className="card-center card-lg">
        <p className="text-gray-600-custom">Effettua il login per vedere i tuoi percorsi salvati</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card-center card-lg">
        <FaSpinner className="spinner mx-auto" />
        <p className="mt-2 text-gray-600-custom">Caricamento percorsi...</p>
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <div className="card-center card-lg">
        <FaRoute className="text-4xl text-gray-300 mb-3 mx-auto" />
        <p className="text-gray-600-custom">Non hai ancora salvato nessun percorso</p>
      </div>
    )
  }

  return (
    <>
      <div className="card w-full-max-xl">
        <h3 className="text-lg font-bold mb-4 text-gray-800-custom">I tuoi percorsi salvati</h3>
        
        <div className="list-container">
          {routes.map(route => (
            <div
              key={route.$id}
              className="list-item-hover"
            >
              <div className="flex-start">
                <div className="flex-1">
                  {/* Nome percorso - editable */}
                  {editingId === route.$id ? (
                    <div className="space-x-2-items mb-2">
                      <input
                        type="text"
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        className="input flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(route.$id)
                          if (e.key === 'Escape') cancelRename()
                        }}
                      />
                      <button
                        onClick={() => saveRename(route.$id)}
                        disabled={savingNameId === route.$id}
                        className="btn-success btn-icon"
                        title="Salva"
                      >
                        {savingNameId === route.$id ? (
                          <FaSpinner className="spinner-sm" />
                        ) : (
                          <FaCheck />
                        )}
                      </button>
                      <button
                        onClick={cancelRename}
                        className="btn-ghost btn-icon"
                        title="Annulla"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-between mb-2">
                      <h4 className="font-bold text-gray-800-custom">{route.name}</h4>
                      <button
                        onClick={() => startRename(route)}
                        className="icon-btn-gray"
                        title="Rinomina"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  )}
                  
                  {/* Info percorso */}
                  <div className="text-xs text-gray-500-custom mt-1 space-y-1">
                    <p>📍 {route.startPoint.name?.substring(0, 50)}...</p>
                    <p>🏁 {route.endPoint.name?.substring(0, 50)}...</p>
                    <div className="space-x-2-items mt-2">
                      <span>📏 {formatDistance(route.distance, settings?.distanceUnit || 'km')}</span>
                      <span>⏱️ {formatDurationMinutes(route.duration, settings?.durationFormat || 'hms')}</span>
                      <span>⛰️ {formatElevation(route.ascent, settings?.elevationUnit || 'm')}</span>
                    </div>
                    {route.createdAt && (
                      <p className="text-muted">Salvato: {formatTimestamp(route.createdAt)}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 ml-3">
                  {/* Bottone Tracking GPS */}
                  <button
                    onClick={() => handleStartTracking(route)}
                    className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                    title="Inizia percorso con tracking GPS"
                  >
                    <FaPlay className="text-lg" />
                  </button>
                  
                  {/* Bottone Carica sulla mappa */}
                  <button
                    onClick={() => onLoadRoute(route)}
                    className="text-indigo-600 hover:text-indigo-800 p-1 transition-colors"
                    title="Visualizza percorso sulla mappa"
                  >
                    <FaMapMarkedAlt className="text-lg" />
                  </button>
                  
                  {/* Bottone Segna come completato (senza GPS) */}
                  <button
                    onClick={() => handleComplete(route.$id)}
                    disabled={completing === route.$id}
                    className="text-green-600 hover:text-green-800 disabled:text-gray-400 p-1 transition-colors"
                    title="Segna come completato (senza GPS)"
                  >
                    {completing === route.$id ? (
                      <FaSpinner className="spinner-sm" />
                    ) : (
                      <FaCheckCircle className="text-lg" />
                    )}
                  </button>
                  
                  {/* Bottone Elimina */}
                  <button
                    onClick={() => handleDelete(route.$id)}
                    disabled={deleting === route.$id}
                    className="text-red-600 hover:text-red-800 disabled:text-gray-400 p-1 transition-colors"
                    title="Elimina percorso"
                  >
                    {deleting === route.$id ? (
                      <FaSpinner className="spinner-sm" />
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