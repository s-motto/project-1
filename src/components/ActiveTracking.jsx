import React, { useState, useEffect, useRef, useMemo } from 'react'
import { FaPlay, FaPause, FaStop, FaTimes, FaMapMarkerAlt, FaExclamationTriangle } from 'react-icons/fa'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import useGeolocation from '../hooks/useGeolocation'
import routesService from '../services/routesService'
import { useAuth } from '../contexts/AuthContext'
import {
  calculateDistance,
  calculateTotalDistance,
  calculateElevationGain,
  calculateElevationLoss,
  formatTime,
  calculateSpeed
} from '../utils/gpsUtils'
import 'leaflet/dist/leaflet.css'
import { useToast } from '../contexts/ToastContext'

// Componente per centrare la mappa sulla posizione corrente
function MapCenterController({ position, shouldCenter, onMapReady }) {
  const map = useMap()
  
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map) // Passa l'istanza della mappa
    }
  }, [map, onMapReady])
  
  useEffect(() => {
    if (position && shouldCenter && map) {
      map.setView([position.lat, position.lng], 16)
    }
  }, [position, shouldCenter, map])
  
  return null
}

/**
 * Componente per tracking GPS in tempo reale
 */
const ActiveTracking = ({ route, onClose, onComplete }) => {
  const { user } = useAuth()
  const geolocation = useGeolocation()
  const { toast } = useToast()
  
  // Stati
  const [isTracking, setIsTracking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [trackPoints, setTrackPoints] = useState([])
  const [currentPosition, setCurrentPosition] = useState(null)
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [distance, setDistance] = useState(0)
  const [elevationGain, setElevationGain] = useState(0)
  const [elevationLoss, setElevationLoss] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [savedRouteId, setSavedRouteId] = useState(route.$id || null)
  const [shouldCenterMap, setShouldCenterMap] = useState(true)
  const [waitingForGoodFix, setWaitingForGoodFix] = useState(true)
  
  // Refs
  const startTimeRef = useRef(null)
  const pausedTimeRef = useRef(0)
  const timerRef = useRef(null)
  const mapRef = useRef(null) // Riferimento alla mappa Leaflet
  const isTrackingRef = useRef(false)
  const isPausedRef = useRef(false)

  // Gestisce il blur della mappa quando la modale è aperta
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
   }, [])

   // Timer per tempo trascorso
useEffect(() => {
  if (isTracking && !isPaused) {
    timerRef.current = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTimeRef.current - pausedTimeRef.current) / 1000)
      setElapsedTime(elapsed)
    }, 1000)
  } else {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }
  
  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }
}, [isTracking, isPaused])

// Cleanup: ferma GPS quando il componente viene smontato
useEffect(() => {
  return () => {
    geolocation.stop()
  }
}, [geolocation])

  // Gestione posizione GPS
  const handlePositionUpdate = (position) => {
    const newPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      altitude: position.coords.altitude,
      timestamp: position.timestamp,
      accuracy: position.coords.accuracy
    }
    
    setCurrentPosition(newPoint)
    setGpsAccuracy(position.coords.accuracy)
    
    // Se accuracy è buona (< 50m), considera il GPS "fixed"
    if (position.coords.accuracy < 50) {
      setWaitingForGoodFix(false)
    }
    
    // Aggiungi punto solo se non in pausa e se tracking è iniziato
    if (!isPausedRef.current && isTrackingRef.current) {
      setTrackPoints(prev => {
        const updated = [...prev, newPoint]
        
        // Calcola distanza
        if (updated.length > 1) {
          const newDistance = calculateTotalDistance(updated)
          setDistance(newDistance)
          
          // Calcola dislivelli se disponibile altitudine
          if (newPoint.altitude !== undefined && newPoint.altitude !== null) {
            setElevationGain(calculateElevationGain(updated))
            setElevationLoss(calculateElevationLoss(updated))
          }
        }
        
        return updated
      })
      
      // Dopo i primi punti, disabilita auto-center
      if (updated.length > 3) {
        setShouldCenterMap(false)
      }
    }
  }

  const handlePositionError = (error) => {
    console.error('GPS Error:', error)
    let errorMsg = 'Errore GPS: '
    if (error.code === 1) {
      errorMsg += 'Permesso negato. Abilita il GPS nelle impostazioni del browser.'
    } else if (error.code === 2) {
      errorMsg += 'Posizione non disponibile. Sei all\'aperto?'
    } else if (error.code === 3) {
      errorMsg += 'Timeout. Il GPS impiega troppo tempo.'
    } else {
      errorMsg += error.message
    }
    toast.error(errorMsg)
  }

  // Salva il percorso se non è ancora salvato
  const ensureRouteSaved = async () => {
    if (savedRouteId) {
      return savedRouteId // Già salvato
    }
    
    // Salva il percorso
    const result = await routesService.saveRoute(
      {
        name: route.name || 'Percorso tracciato',
        startPoint: route.startPoint,
        endPoint: route.endPoint,
        distance: route.distance,
        duration: route.duration,
        ascent: route.ascent || 0,
        descent: route.descent || 0,
        coordinates: route.coordinates,
        instructions: Array.isArray(route.instructions) ? route.instructions : []
      },
      user.$id
    )
    
    if (result.success) {
      setSavedRouteId(result.data.$id)
      return result.data.$id
    } else {
      throw new Error('Impossibile salvare il percorso')
    }
  }

  // Avvia tracking
  const handleStart = async () => {
    if (!isTracking) {
      // Se il percorso non è salvato, salvalo ora
      if (!savedRouteId) {
        try {
          await ensureRouteSaved()
          toast.info('Percorso salvato automaticamente per il tracking')
        } catch (error) {
          toast.error('Errore nel salvare il percorso: ' + error.message)
        }
      }
      
      // Primo avvio
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      setIsTracking(true)
      setIsPaused(false)
      isTrackingRef.current = true
      isPausedRef.current = false
      setShouldCenterMap(true)
      setWaitingForGoodFix(true)
      
      // Avvia GPS
      geolocation.start(
        handlePositionUpdate,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        }
      )
    }
  }

  // Pausa tracking
  const handlePause = () => {
    if (!isPaused) {
      const now = Date.now()
      pausedTimeRef.current += now - startTimeRef.current - elapsedTime * 1000
      setIsPaused(true)
      isPausedRef.current = true
    }
  }

  // Riprendi tracking
  const handleResume = () => {
    if (isPaused) {
      setIsPaused(false)
      isPausedRef.current = false
    }
  }

  // Termina e salva
const handleStop = async () => {
  if (!confirm('Vuoi terminare il percorso e salvare i dati?')) return
  
  setIsSaving(true)
  
  try {
    // PRIMA ferma GPS
    geolocation.stop()
    setIsTracking(false)
    isTrackingRef.current = false
    
    // Assicura che il percorso sia salvato
    const routeId = await ensureRouteSaved()
    
    // Prepara i dati da salvare
    const completedData = {
      status: 'completed',
      completedAt: new Date().toISOString(),
      actualDistance: parseFloat(distance.toFixed(2)),
      actualDuration: Math.floor(elapsedTime / 60),
      actualAscent: elevationGain,
      actualDescent: elevationLoss,
      actualCoordinates: JSON.stringify(trackPoints)
    }
    
    // Aggiorna il percorso
    const result = await routesService.updateRoute(routeId, completedData)
    
    if (result.success) {
      toast.success('Percorso completato e salvato!')
      if (onComplete) onComplete()
      onClose()
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Error saving track:', error)
    toast.error('Errore nel salvare il percorso: ' + error.message)
    // Riavvia GPS se c'è errore? O lascia fermo?
  } finally {
    setIsSaving(false)
  }
}

  // Annulla tracking
  const handleCancel = () => {
    if (!confirm('Vuoi annullare il tracking? I dati non verranno salvati.')) return
    
    geolocation.stop()
    setIsTracking(false)
    isTrackingRef.current = false
    onClose()
  }

  // Velocità media
  const avgSpeed = calculateSpeed(distance, elapsedTime)

  // Determina il centro iniziale della mappa
  const getInitialCenter = () => {
    if (currentPosition) {
      return [currentPosition.lat, currentPosition.lng]
    }
    
    if (route.startPoint) {
      return [route.startPoint.lat, route.startPoint.lon]
    }
    
    return [44.102, 9.824] // La Spezia
  }

  const initialCenter = getInitialCenter()

  //  Callback quando la mappa è pronta
  const handleMapReady = (map) => {
    mapRef.current = map
    // Forza ricalcolo dimensioni dopo 300ms
    setTimeout(() => {
      if (map) {
        map.invalidateSize()
      }
    }, 300)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="modal-header-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaMapMarkerAlt className="text-3xl" />
              <div>
                <h2 className="text-2xl font-bold">{route.name || 'Tracking GPS'}</h2>
                <p className="text-sm text-blue-100">
                  {isTracking ? (isPaused ? '⏸️ In pausa' : '🔴 Registrazione in corso') : '⏺️ Pronto per iniziare'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleCancel} 
              className="modal-close-btn"
              aria-label="Chiudi"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* GPS Warning se impreciso */}
        {waitingForGoodFix && gpsAccuracy && gpsAccuracy > 50 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mx-4 mt-4 rounded">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-yellow-600 mr-3" />
              <div className="text-sm">
                <p className="font-bold text-yellow-800">GPS impreciso</p>
                <p className="text-yellow-700">
                  Precisione: {Math.round(gpsAccuracy)}m. Vai all'aperto per migliorare il segnale.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistiche live */}
        <div className="p-4 bg-gray-50 border-b grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">Distanza</p>
            <p className="text-lg font-bold text-blue-600">{distance.toFixed(2)} km</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Tempo</p>
            <p className="text-lg font-bold text-purple-600">{formatTime(elapsedTime)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Velocità</p>
            <p className="text-lg font-bold text-green-600">{avgSpeed} km/h</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">D+ ⛰️</p>
            <p className="text-lg font-bold text-orange-600">{elevationGain} m</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Precisione GPS</p>
            <p className={`text-lg font-bold ${gpsAccuracy && gpsAccuracy < 20 ? 'text-green-600' : gpsAccuracy && gpsAccuracy < 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {gpsAccuracy ? `${Math.round(gpsAccuracy)}m` : '---'}
            </p>
          </div>
        </div>

        {/* Mappa */}
        <div className="flex-1 relative">
          <MapContainer
            center={initialCenter}
            zoom={15}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Route pianificata (se disponibile) - riferimento */}
            {route.coordinates && route.coordinates.length > 1 && (
              <Polyline 
                positions={route.coordinates.map(coord => {
                  // Handle both [lon, lat] and {lat, lng} formats
                  if (Array.isArray(coord)) {
                    return [coord[1], coord[0]] // [lat, lng] from [lon, lat]
                  }
                  return [coord.lat, coord.lng]
                })}
                color="#ef4444" // Red - planned route
                weight={3}
                opacity={0.5}
                dashArray="10, 10" // Dashed line
              />
            )}
            
            {/* Traccia GPS - il percorso effettivamente tracciato */}
            {useMemo(() => {
              if (trackPoints.length < 2) return null
              
              return (
                <Polyline 
                  key={`track-${trackPoints.length}`} // Force re-render when points change
                  positions={trackPoints.map(p => [p.lat, p.lng])}
                  color="#10b981" // Green - more visible for hiking
                  weight={5} // Thicker line
                  opacity={0.9}
                  smoothFactor={1} // Less smoothing for more accurate trail
                />
              )
            }, [trackPoints])}
            
            {/* Posizione corrente */}
            {currentPosition && (
              <Marker position={[currentPosition.lat, currentPosition.lng]}>
              </Marker>
            )}
            
            {/* Auto-centra sulla posizione solo all'inizio + Fix mappa */}
            {currentPosition && (
              <MapCenterController 
                position={currentPosition} 
                shouldCenter={shouldCenterMap}
                onMapReady={handleMapReady}
              />
            )}
          </MapContainer>
          
          {/* Info GPS */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 text-xs z-[1000]">
            <p className="font-bold">📍 Punti GPS: {trackPoints.length}</p>
            {currentPosition && (
              <>
                <p className="text-gray-600">Lat: {currentPosition.lat.toFixed(6)}</p>
                <p className="text-gray-600">Lng: {currentPosition.lng.toFixed(6)}</p>
                {currentPosition.altitude && (
                  <p className="text-gray-600">Alt: {Math.round(currentPosition.altitude)}m</p>
                )}
                {gpsAccuracy && (
                  <p className={gpsAccuracy < 20 ? 'text-green-600 font-bold' : gpsAccuracy < 50 ? 'text-yellow-600' : 'text-red-600'}>
                    ±{Math.round(gpsAccuracy)}m
                  </p>
                )}
              </>
            )}
            {waitingForGoodFix && (
              <p className="text-yellow-600 mt-1 font-bold">🔍 Cercando fix preciso...</p>
            )}
          </div>
        </div>

        {/* Controlli */}
        <div className="p-4 bg-white border-t flex justify-center space-x-3">
          {!isTracking ? (
            <button
              onClick={handleStart}
              className="btn-primary flex items-center space-x-2 px-6 py-3"
            >
              <FaPlay />
              <span>Inizia Percorso</span>
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg flex items-center space-x-2 px-6 py-3 transition"
                >
                  <FaPause />
                  <span>Pausa</span>
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="btn-primary flex items-center space-x-2 px-6 py-3"
                >
                  <FaPlay />
                  <span>Riprendi</span>
                </button>
              )}
              
              <button
                onClick={handleStop}
                disabled={isSaving || trackPoints.length < 2}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg flex items-center space-x-2 px-6 py-3 disabled:opacity-50 transition"
              >
                <FaStop />
                <span>{isSaving ? 'Salvataggio...' : 'Termina e Salva'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActiveTracking