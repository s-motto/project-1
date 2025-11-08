import React, { useState, useEffect, useRef, useMemo } from 'react' // importo react e hook necessari
import { FaPlay, FaPause, FaStop, FaTimes, FaMapMarkerAlt, FaExclamationTriangle } from 'react-icons/fa' // importo icone da react-icons
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet' // importo componenti da react-leaflet
import useGeolocation from '../hooks/useGeolocation' // importo hook personalizzato per geolocalizzazione
import routesService from '../services/routesService' // importo servizio per gestione rotte
import { useAuth } from '../contexts/AuthContext' // importo contesto di autenticazione
import {
  calculateDistance,
  calculateTotalDistance,
  calculateElevationGain,
  calculateElevationLoss,
  formatTime,
  calculateSpeed,
  formatDistance,
  formatElevation,
  formatSpeedKmh,
  formatDurationSeconds
} from '../utils/gpsUtils' // importo funzioni di utilità per GPS
import 'leaflet/dist/leaflet.css' // importo stili di Leaflet
import { useToast } from '../contexts/ToastContext' // importo contesto per toast notifiche
import logger from '../utils/logger' // importo logger per debug
import { useSettings } from '../contexts/SettingsContext' // importo contesto per impostazioni utente

// Componente per centrare la mappa sulla posizione corrente
function MapCenterController({ position, shouldCenter, onMapReady }) {
  const map = useMap()
  const hasCenteredRef = useRef(false)
  const userHasInteractedRef = useRef(false)
  // Avviso mappa pronta
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map)
      
      // Track user interactions (zoom and pan)
      const handleZoom = () => { userHasInteractedRef.current = true }
      const handleDrag = () => { userHasInteractedRef.current = true }
      
      map.on('zoomstart', handleZoom)
      map.on('dragstart', handleDrag)
      
      return () => {
        map.off('zoomstart', handleZoom)
        map.off('dragstart', handleDrag)
      }
    }
  }, [map, onMapReady])
  
  useEffect(() => {
    // Centra la mappa solo se richiesto e non è già stato fatto
    if (position && shouldCenter && map && !hasCenteredRef.current && !userHasInteractedRef.current) {
      const currentZoom = map.getZoom()
      map.setView([position.lat, position.lng], currentZoom || 16)
      hasCenteredRef.current = true
    }
  }, [position, shouldCenter, map])
  
  return null
}

// Componente principale ActiveTracking
const ActiveTracking = ({ route, onClose, onComplete }) => {
  const { user } = useAuth()
  const geolocation = useGeolocation()
  const { toast } = useToast()
  const { settings } = useSettings()
  
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
  // Cleanup all'unmount
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
    
    // Se accuracy è buona (< soglia impostazioni), considera il GPS "fixed"
    if (position.coords.accuracy < (settings?.gpsAccuracyMax ?? 50)) {
      setWaitingForGoodFix(false)
    }
    
    // Aggiungi punto solo se non in pausa e se tracking è iniziato
    if (!isPausedRef.current && isTrackingRef.current) {
      // Filtra per accuratezza massima
      if (settings?.gpsAccuracyMax && position.coords.accuracy > settings.gpsAccuracyMax) {
        return
      }
      setTrackPoints(prev => {
        // Filtra spostamenti minimi per ridurre il rumore
        if (settings?.minPointDistanceMeters && prev.length > 0) {
          const last = prev[prev.length - 1] // Ultimo punto
          const R = 6371000 // raggio terrestre in metri
          const dLat = (newPoint.lat - last.lat) * Math.PI / 180 // conversione in radianti
          const dLon = (newPoint.lng - last.lng) * Math.PI / 180 // conversione in radianti
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(last.lat * Math.PI/180) * Math.cos(newPoint.lat * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2) // formula haversine
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) // formula haversine
          const meters = R * c // distanza in metri
          if (meters < settings.minPointDistanceMeters) { // troppo vicino all'ultimo punto 
            return prev
          }
        }
        const updated = [...prev, newPoint] // Aggiungi nuovo punto
        
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
        
        // Dopo i primi punti, disabilita auto-center
        if (updated.length > 3) {
          setShouldCenterMap(false)
        }
        
        return updated
      })
    }
  }
// Gestione errori GPS
  const handlePositionError = (error) => {
    logger.error('GPS Error:', error)
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
    // Se salvato
    if (result.success) {
      setSavedRouteId(result.data.$id)
      return result.data.$id
    } else { // Errore
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
      startTimeRef.current = Date.now() // Timestamp di inizio
      pausedTimeRef.current = 0 // Reset tempo in pausa
      setIsTracking(true) // Stato tracking
      setIsPaused(false)  // Stato pausa
      isTrackingRef.current = true  // Ref tracking
      isPausedRef.current = false   // Ref pausa
      setShouldCenterMap(true)  // Auto-center mappa
      setWaitingForGoodFix(true)    // Aspetta fix GPS
      
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
      // Notifica risultato
      if (result.success) {
        toast.success('Percorso completato e salvato!')
        if (onComplete) onComplete()
        onClose()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      logger.error('Error saving track:', error)
      toast.error('Errore nel salvare il percorso: ' + error.message)
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
  const distanceLabel = formatDistance(distance, settings?.distanceUnit || 'km')
  const speedLabel = formatSpeedKmh(avgSpeed, settings?.distanceUnit || 'km')
  const gainLabel = formatElevation(elevationGain, settings?.elevationUnit || 'm')

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
 // Render del componente
  return (
    <div className="modal-overlay">
      <div className="modal-content w-full-max-4xl h-[95vh] flex flex-col">
        {/* Header */}
        <div className="modal-header-primary">
          <div className="flex-between">
            <div className="space-x-3-items">
              <FaMapMarkerAlt className="text-3xl" />
              <div>
                <h2 className="text-2xl font-bold">{route.name || 'Tracking GPS'}</h2>
                <p className="text-sm text-blue-100">
                  {isTracking ? (isPaused ? '⏸️ In pausa' : '🟢 Tracking attivo') : '⚪ Pronto per partire'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="icon-btn-white"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* Statistiche GPS */}
        <div className="card-beige p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {/* Tempo */}
            <div>
              <p className="text-xs text-muted">Tempo</p>
              <p className="text-2xl font-bold "style={{ color: 'var(--text-primary)' }}>{formatTime(elapsedTime)}</p>
            </div>
            
            {/* Distanza */}
            <div>
              <p className="text-xs text-muted">Distanza</p>
              <p className="text-2xl font-bold"style={{ color: 'var(--text-primary)' }}>{distanceLabel}</p>
            </div>
            
            {/* Velocità media */}
            <div>
              <p className="text-xs text-muted">Velocità Media</p>
              <p className="text-2xl font-bold "style={{ color: 'var(--text-primary)' }}>{speedLabel}</p>
            </div>
            
            {/* Dislivello */}
            <div>
              <p className="text-xs text-muted">Dislivello (+/-)</p>
              <p className="text-2xl font-bold "style={{ color: 'var(--text-primary)' }}>
                {gainLabel}
              </p>
              <p className={`text-xs font-bold ${gpsAccuracy && gpsAccuracy < 20 ? 
                'text-green-600' : gpsAccuracy && gpsAccuracy < 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {gpsAccuracy ? `±${formatElevation(Math.round(gpsAccuracy), settings?.elevationUnit || 'm')}` : '---'}
              </p>
            </div>
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
                  // Supporta sia oggetti che array
                  if (Array.isArray(coord)) {
                    return [coord[1], coord[0]] // [lat, lng]
                  }
                  return [coord.lat, coord.lng]
                })}
                color="#ef4444" 
                weight={3}
                opacity={0.5}
                dashArray="10, 10" 
              />
            )}
            
            {/* Traccia GPS - il percorso effettivamente tracciato */}
            {useMemo(() => {
              if (trackPoints.length < 2) return null
              // Ritorna il Polyline della traccia
              return (
                <Polyline 
                  key={`track-${trackPoints.length}`} // Forza rerender su aggiornamento
                  positions={trackPoints.map(p => [p.lat, p.lng])}
                  color="#10b981" 
                  weight={5} 
                  opacity={0.9}
                  smoothFactor={1} 
                />
              )
            }, [trackPoints])}
            
            {/* Posizione corrente */}
            {currentPosition && (
              <Marker position={[currentPosition.lat, currentPosition.lng]}>
              </Marker>
            )}

            {/* Auto-centra sulla posizione solo all'inizio */}
            {currentPosition && (
              <MapCenterController 
                position={currentPosition} 
                shouldCenter={shouldCenterMap}
                onMapReady={handleMapReady}
              />
            )}
          </MapContainer>
          
          {/* Info GPS */}
          <div className="card absolute top-4 left-4 text-xs z-[1000] p-2">
            <p className="font-bold">📍 Punti GPS: {trackPoints.length}</p>
            {currentPosition && (
              <>
                <p className="text-gray-600-custom">Lat: {currentPosition.lat.toFixed(6)}</p>
                <p className="text-gray-600-custom">Lng: {currentPosition.lng.toFixed(6)}</p>
                {currentPosition.altitude && (
                  <p className="text-gray-600-custom">Alt: {formatElevation(Math.round(currentPosition.altitude), settings?.elevationUnit || 'm')}</p>
                )}
                {gpsAccuracy && (
                  <p className={gpsAccuracy < 20 ? 'text-green-600 font-bold' : gpsAccuracy < 50 ? 'text-yellow-600' : 'text-red-600'}>
                    ±{formatElevation(Math.round(gpsAccuracy), settings?.elevationUnit || 'm')}
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
        <div className="card border-t flex-center p-4 space-x-3">
          {!isTracking ? (
            <button
              onClick={handleStart}
              className="btn-primary space-x-2-items px-6 py-3"
            >
              <FaPlay />
              <span>Inizia Percorso</span>
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="btn-yellow space-x-2-items px-6 py-3"
                >
                  <FaPause />
                  <span>Pausa</span>
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="btn-primary space-x-2-items px-6 py-3"
                >
                  <FaPlay />
                  <span>Riprendi</span>
                </button>
              )}
              
              <button
                onClick={handleStop}
                disabled={isSaving || trackPoints.length < 2}
                className="btn-green space-x-2-items px-6 py-3 disabled:opacity-50"
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