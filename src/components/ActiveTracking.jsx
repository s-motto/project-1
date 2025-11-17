// ==========================================
// ACTIVE TRACKING COMPONENT
// ==========================================
// Componente per il tracking GPS in tempo reale con supporto waypoints
// 
// Funzionalità principali:
// - Tracking GPS continuo con traccia verde
// - Percorso pianificato visualizzato in blu tratteggiato
// - Aggiunta waypoints tramite long press sulla mappa (max 5)
// - Ricalcolo automatico del percorso con waypoints
// - Statistiche in tempo reale (distanza, tempo, velocità, elevazione)
// - Pausa/riprendi tracking
// - Salvataggio automatico su Appwrite
// 
// Dark mode: Supportato tramite CSS variables (--bg-card, --text-primary, ecc.)
// Mobile-first: Layout ottimizzato per schermi piccoli
// ==========================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  FaTimes,
  FaMapMarkerAlt
} from 'react-icons/fa'

// Services e utilities
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useSettings } from '../contexts/SettingsContext'
import useGeolocation from '../hooks/useGeolocation'
import useTrackingTimer from '../hooks/useTrackingTimer'
import useTrackingSave from '../hooks/useTrackingSave' // ✅ NUOVO HOOK SALVATAGGIO
import logger from '../utils/logger'
import {
  calculateDistance,
  calculateSpeed
} from '../utils/gpsUtils'

// Componenti tracking
import { TrackingStats, TrackingControls, WaypointDialog, TrackingMap } from './ActiveTracking/index.js'

// ==========================================
// COMPONENTE PRINCIPALE
// ==========================================
const ActiveTracking = ({ route, onClose, onComplete }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const { settings } = useSettings()
  const geolocation = useGeolocation()

  // ========== GPS TRACKING STATE ==========
  const [isTracking, setIsTracking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(null)
  const [trackPoints, setTrackPoints] = useState([]) // Traccia GPS reale (verde)
  const [distance, setDistance] = useState(0) // Distanza percorsa (km)
  const [elevationGain, setElevationGain] = useState(0) // Salita accumulata (m)
  const [elevationLoss, setElevationLoss] = useState(0) // Discesa accumulata (m)
  const [heading, setHeading] = useState(0) // Direzione movimento (gradi)
  const [gpsAccuracy, setGpsAccuracy] = useState(null) // Accuratezza GPS (metri)
  const [waitingForGoodFix, setWaitingForGoodFix] = useState(false)
  const [shouldCenterMap, setShouldCenterMap] = useState(true)
 

  // ========== WAYPOINTS STATE ==========
  const [waypoints, setWaypoints] = useState([]) // Array di waypoints: [{lat, lng, name}] - max 5
  const [tempWaypoint, setTempWaypoint] = useState(null) // Waypoint temporaneo durante selezione: {lat, lng}
  const [showWaypointDialog, setShowWaypointDialog] = useState(false) // Mostra/nascondi dialog conferma
  const [waypointPreview, setWaypointPreview] = useState(null) // Preview percorso: {distance, duration, name}
  const [loadingPreview, setLoadingPreview] = useState(false) // Loading durante calcolo preview
  const [recalculatingRoute, setRecalculatingRoute] = useState(false) // Loading durante ricalcolo percorso

  // ========== ROUTE STATE ==========
  // Converti coordinate da GeoJSON [lon, lat] a Leaflet [lat, lon]
  // Le coordinate dall'API OpenRouteService sono SEMPRE in formato GeoJSON [lon, lat]
  const normalizeRoute = (routeData) => {
    if (!routeData.coordinates || routeData.coordinates.length === 0) {
      return routeData
    }

    // Controlla se le coordinate sono già in formato corretto Leaflet [lat, lon]
    // GeoJSON: [lon, lat] dove lon è tipicamente minore (9-18 per l'Italia)
    // Leaflet: [lat, lon] dove lat è tipicamente maggiore (44-47 per l'Italia)
    const firstCoord = routeData.coordinates[0]

    // Se il primo valore è minore del secondo, sono probabilmente [lon, lat] e vanno invertite
    const needsConversion = Array.isArray(firstCoord) && firstCoord[0] < firstCoord[1]

    if (needsConversion) {
      return {
        ...routeData,
        coordinates: routeData.coordinates.map(coord => [coord[1], coord[0]])
      }
    }

    return routeData
  }

  const normalizedRoute = useMemo(() => normalizeRoute(route), [route])
  const originalRouteRef = useRef(normalizedRoute) // Salva percorso originale per reset
  const [currentRouteData, setCurrentRouteData] = useState(normalizedRoute) // Percorso visualizzato (può cambiare con waypoints)
  const [showWaypointsList, setShowWaypointsList] = useState(false) // Mostra/nascondi lista waypoints

  // ========== REFS ==========
  const isTrackingRef = useRef(false)
  const isPausedRef = useRef(false)
  const mapRef = useRef(null)
  const lastElevation = useRef(null)

  // ========== HOOK TIMER TRACKING ==========
  const { elapsedTime } = useTrackingTimer(isTracking, isPaused)

  // ========== HOOK SALVATAGGIO TRACKING ==========
  const { isSaving, savedRouteId, ensureRouteSaved, saveCompletedTracking } = useTrackingSave({
    route,
    user,
    trackingData: {
      distance,
      elapsedTime,
      elevationGain,
      elevationLoss,
      trackPoints
    },
    toast,
    onComplete
  })

  // ==========================================
  // WAYPOINT UTILITIES
  // ==========================================

  /**
   * Reverse Geocoding: ottiene il nome del luogo dalle coordinate
   * Usa OpenRouteService reverse geocoding API
   * 
   * @param {Number} lat - Latitudine
   * @param {Number} lng - Longitudine
   * @returns {Promise<String>} Nome del luogo o coordinate formattate
   */
  const reverseGeocode = async (lat, lng) => {
    try {
      const ORS_KEY = import.meta.env.VITE_OPENROUTE_API_KEY
      const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${ORS_KEY}&point.lon=${lng}&point.lat=${lat}&size=1`

      const response = await fetch(url)
      if (!response.ok) {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      }

      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const props = data.features[0].properties
        return props.name || props.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      }

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch (error) {
      logger.error('Reverse geocoding error:', error)
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }

  /**
   * Calcola preview del percorso con il nuovo waypoint
   * Chiama OpenRouteService per ottenere distanza e durata stimata
   * 
   * Logica:
   * 1. Parte dalla posizione corrente o start originale
   * 2. Passa per tutti i waypoints esistenti
   * 3. Aggiunge il nuovo waypoint
   * 4. Arriva alla destinazione finale
   * 
   * @param {Object} newWaypoint - {lat, lng} del waypoint da aggiungere
   * @returns {Promise<Object>} {distance, duration, name, coordinates, ascent, descent}
   */
  const calculateWaypointPreview = async (newWaypoint) => {
    setLoadingPreview(true)

    try {
      const ORS_KEY = import.meta.env.VITE_OPENROUTE_API_KEY

      // Costruisci array coordinate
      const coordinates = []

      // 1. Punto di partenza: posizione corrente o start originale
      if (currentPosition) {
        coordinates.push([currentPosition.lng, currentPosition.lat])
      } else {
        coordinates.push([route.startPoint.lon, route.startPoint.lat])
      }

      // 2. Tutti i waypoints esistenti
      waypoints.forEach(wp => {
        coordinates.push([wp.lng, wp.lat])
      })

      // 3. Nuovo waypoint
      coordinates.push([newWaypoint.lng, newWaypoint.lat])

      // 4. Destinazione finale
      coordinates.push([route.endPoint.lon, route.endPoint.lat])

      // Chiamata API
      const url = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ORS_KEY
        },
        body: JSON.stringify({ coordinates })
      })

      if (!response.ok) {
        throw new Error('API error')
      }

      const data = await response.json()
      const feature = data.features[0]
      const props = feature.properties.segments[0]

      // Estrai dati preview
      const preview = {
        distance: (props.distance / 1000).toFixed(2), // km
        duration: Math.round(props.duration / 60), // minuti
        name: newWaypoint.name,
        coordinates: feature.geometry.coordinates.map(c => [c[1], c[0]]), // Converti a Leaflet
        ascent: props.ascent || 0,
        descent: props.descent || 0
      }

      setWaypointPreview(preview)
      setLoadingPreview(false)
      return preview
    } catch (error) {
      logger.error('Waypoint preview error:', error)
      setLoadingPreview(false)
      toast.error('Errore nel calcolo del percorso')
      return null
    }
  }

  /**
   * Ricalcola il percorso completo con tutti i waypoints confermati
   * Aggiorna currentRouteData con il nuovo percorso
   */
  const recalculateRouteWithWaypoints = async () => {
    if (waypoints.length === 0) {
      // Nessun waypoint, usa percorso originale
      setCurrentRouteData(originalRouteRef.current)
      return
    }

    setRecalculatingRoute(true)

    try {
      const ORS_KEY = import.meta.env.VITE_OPENROUTE_API_KEY

      // Costruisci coordinate: start -> waypoints -> end
      const coordinates = []

      // Start (posizione corrente o originale)
      if (currentPosition) {
        coordinates.push([currentPosition.lng, currentPosition.lat])
      } else {
        coordinates.push([route.startPoint.lon, route.startPoint.lat])
      }

      // Waypoints
      waypoints.forEach(wp => {
        coordinates.push([wp.lng, wp.lat])
      })

      // End
      coordinates.push([route.endPoint.lon, route.endPoint.lat])

      // API Call
      const url = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ORS_KEY
        },
        body: JSON.stringify({ coordinates })
      })

      if (!response.ok) {
        throw new Error('API error')
      }

      const data = await response.json()
      const feature = data.features[0]
      const props = feature.properties.segments[0]

      // Aggiorna percorso visualizzato
      const newRouteData = {
        ...originalRouteRef.current,
        coordinates: feature.geometry.coordinates.map(c => [c[1], c[0]]), // Leaflet format
        distance: (props.distance / 1000).toFixed(2),
        duration: Math.round(props.duration / 60),
        ascent: props.ascent || 0,
        descent: props.descent || 0
      }

      setCurrentRouteData(newRouteData)
      setRecalculatingRoute(false)
      toast.success('Percorso aggiornato con waypoint!')
    } catch (error) {
      logger.error('Route recalculation error:', error)
      setRecalculatingRoute(false)
      toast.error('Errore nel ricalcolo del percorso')
    }
  }

  // ==========================================
  // WAYPOINT HANDLERS
  // ==========================================

  /**
   * Gestisce long press sulla mappa per aggiungere waypoint
   */
  const handleMapLongPress = async (latlng) => {
    // Verifica limiti
    if (waypoints.length >= 5) {
      toast.warning('Massimo 5 waypoints consentiti')
      return
    }

    if (!isTracking) {
      toast.info('Avvia il tracking per aggiungere waypoints')
      return
    }

    // Ottieni nome luogo
    const placeName = await reverseGeocode(latlng.lat, latlng.lng)

    // Salva waypoint temporaneo
    setTempWaypoint({
      lat: latlng.lat,
      lng: latlng.lng,
      name: placeName
    })

    // Mostra dialog e calcola preview
    setShowWaypointDialog(true)
    await calculateWaypointPreview({
      lat: latlng.lat,
      lng: latlng.lng,
      name: placeName
    })
  }

  /**
   * Conferma aggiunta waypoint
   */
  const handleConfirmWaypoint = () => {
    if (!tempWaypoint) return

    // Aggiungi waypoint alla lista
    setWaypoints(prev => [...prev, tempWaypoint])

    // Reset stati temporanei
    setTempWaypoint(null)
    setShowWaypointDialog(false)
    setWaypointPreview(null)

    // Ricalcola percorso
    setTimeout(() => {
      recalculateRouteWithWaypoints()
    }, 100)
  }

  /**
   * Annulla aggiunta waypoint
   */
  const handleCancelWaypoint = () => {
    setTempWaypoint(null)
    setShowWaypointDialog(false)
    setWaypointPreview(null)
  }

  /**
   * Rimuovi waypoint specifico
   */
  const handleRemoveWaypoint = (index) => {
    setWaypoints(prev => prev.filter((_, i) => i !== index))

    // Ricalcola dopo breve delay
    setTimeout(() => {
      recalculateRouteWithWaypoints()
    }, 100)
  }

  // ==========================================
  // FORMATTAZIONE PREVIEW
  // ==========================================

  const formatPreviewDistance = (km) => {
    if (!km) return '---'

    if (settings?.distanceUnit === 'mi') {
      const miles = km * 0.621371
      return `${miles.toFixed(2)} mi`
    }

    return `${km} km`
  }

  const formatPreviewDuration = (seconds) => {
    if (!seconds) return '---'

    const minutes = Math.round(seconds / 60)

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}h ${mins}min`
    }

    return `${minutes}min`
  }

  // ==========================================
  // GPS TRACKING LOGIC
  // ==========================================

  /**
   * Gestisce l'aggiornamento della posizione GPS
   * Calcola distanza, elevazione, direzione
   */
  const handlePositionUpdate = useCallback((position) => {
    const newPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      altitude: position.coords.altitude,
      timestamp: position.timestamp,
      accuracy: position.coords.accuracy
    }

    setCurrentPosition(newPoint)
    setGpsAccuracy(position.coords.accuracy)

    if (position.coords.accuracy <= (settings?.gpsAccuracyMax || 150)) {
      setWaitingForGoodFix(false)
    }

    // Se in pausa o non tracking, non registrare punti
    if (!isTrackingRef.current || isPausedRef.current) {
      return
    }

    // Aggiungi punto alla traccia usando functional update
    setTrackPoints(prevTrackPoints => {
      // Calcola direzione dal movimento
      if (prevTrackPoints.length > 0 && !isPausedRef.current && isTrackingRef.current) {
        const lastPoint = prevTrackPoints[prevTrackPoints.length - 1]
        const lat1 = lastPoint.lat * Math.PI / 180
        const lat2 = newPoint.lat * Math.PI / 180
        const dLon = (newPoint.lng - lastPoint.lng) * Math.PI / 180

        const y = Math.sin(dLon) * Math.cos(lat2)
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
        const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360

        setHeading(bearing)
      }

      // Calcola distanza dall'ultimo punto
      if (prevTrackPoints.length > 0) {
        const lastPoint = prevTrackPoints[prevTrackPoints.length - 1]
        const pointDistance = calculateDistance(
          lastPoint.lat,
          lastPoint.lng,
          newPoint.lat,
          newPoint.lng
        )

        // Aggiungi solo se movimento significativo (>3m) e accuratezza buona
        if (pointDistance >= 0.003 && newPoint.accuracy <= (settings?.gpsAccuracyMax || 150)) {
          // Aggiorna distanza totale
          setDistance(prev => prev + pointDistance)

          // Calcola elevazione (se disponibile)
          if (newPoint.altitude && lastElevation.current !== null) {
            const elevDiff = newPoint.altitude - lastElevation.current

            if (elevDiff > 0) {
              setElevationGain(prev => prev + elevDiff)
            } else if (elevDiff < 0) {
              setElevationLoss(prev => prev + Math.abs(elevDiff))
            }
          }

          if (newPoint.altitude) {
            lastElevation.current = newPoint.altitude
          }

          return [...prevTrackPoints, newPoint]
        }
      } else {
        // Primo punto
        if (newPoint.altitude) {
          lastElevation.current = newPoint.altitude
        }
        return [newPoint]
      }

      return prevTrackPoints
    })
  }, [settings])

  /**
   * Gestisce errori GPS
   */
  const handlePositionError = useCallback((error) => {
    logger.error('GPS error:', error)
    let message = 'Errore GPS'

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Permesso GPS negato. Attiva la geolocalizzazione nelle impostazioni.'
        break
      case error.POSITION_UNAVAILABLE:
        message = 'Posizione non disponibile. Verifica di essere all\'aperto.'
        break
      case error.TIMEOUT:
        message = 'Timeout GPS. Riprovo...'
        break
      default:
        message = 'Errore GPS sconosciuto'
    }

    toast.error(message)
  }, [toast])

  // ==========================================
  // TRACKING CONTROL HANDLERS
  // ==========================================

  /**
   * Avvia tracking
   */
  const handleStart = async () => {
    if (!isTracking) {
     
      if (!savedRouteId) {
        try {
          await ensureRouteSaved()
          toast.info('Percorso salvato automaticamente per il tracking')
        } catch (error) {
          toast.error('Errore nel salvare il percorso: ' + error.message)
          return // Non avviare tracking se salvataggio fallisce
        }
      }

      // ✅ SEMPLIFICATO - L'hook gestisce il reset timer automaticamente!
      setIsTracking(true)
      setIsPaused(false)
      isTrackingRef.current = true
      isPausedRef.current = false
      setShouldCenterMap(true)
      setWaitingForGoodFix(true)

      // Verifica permessi GPS
      if (!navigator.geolocation) {
        logger.error('Geolocation non supportato')
        toast.error('GPS non disponibile su questo dispositivo')
        return
      }

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

  /**
   * Pausa tracking
   */
  const handlePause = () => {
    if (!isPaused) {
      
      setIsPaused(true)
      isPausedRef.current = true
    }
  }

  /**
   * Riprendi tracking
   */
  const handleResume = () => {
    if (isPaused) {
      setIsPaused(false)
      isPausedRef.current = false
    }
  }


  /**
   * Termina e salva tracking
   */
  const handleStop = async () => {
    if (!confirm('Vuoi terminare il percorso e salvare i dati?')) return

    // Ferma GPS
    geolocation.stop()
    setIsTracking(false)
    isTrackingRef.current = false

    // hook gestisce salvataggio automaticamente
    const success = await saveCompletedTracking()

    // Chiudi modal dopo salvataggio
    if (success) {
      setTimeout(() => {
        onClose()
      }, 1000)
    }
  }

  /**
   * Annulla tracking senza salvare
   */
  const handleCancel = () => {
    if (!confirm('Vuoi annullare il tracking? I dati non verranno salvati.')) return

    geolocation.stop()
    setIsTracking(false)
    isTrackingRef.current = false
    onClose()
  }

  // ==========================================
  // EFFECTS
  // ==========================================

  // Blocca scroll body quando modal è aperto
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  // ✅ RIMOSSO - Effect del timer ora è dentro l'hook!

  // Cleanup: ferma GPS quando unmount
  useEffect(() => {
    return () => {
      geolocation.stop()
    }
  }, [geolocation])

  // Cleanup waypoints al close
  useEffect(() => {
    return () => {
      setWaypoints([])
      setTempWaypoint(null)
      setShowWaypointDialog(false)
      setWaypointPreview(null)
    }
  }, [])

  // ==========================================
  // CALCOLI STATISTICHE
  // ==========================================
  const avgSpeed = calculateSpeed(distance, elapsedTime)

  // Centro iniziale mappa
  const getInitialCenter = () => {
    if (currentPosition) {
      return [currentPosition.lat, currentPosition.lng]
    }

    if (route.startPoint) {
      return [route.startPoint.lat, route.startPoint.lon]
    }

    return [44.102, 9.824] // La Spezia default
  }

  const initialCenter = getInitialCenter()

  // Callback mappa pronta
  const handleMapReady = (map) => {
    mapRef.current = map
    setTimeout(() => {
      if (map) {
        map.invalidateSize()
      }
    }, 300)
  }

  // Callback ricentra mappa
  const handleCenterMap = () => {
    setShouldCenterMap(true)
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="modal-overlay">
      <div className="modal-content w-full-max-4xl h-[100vh] flex flex-col">

        {/* ========== HEADER ========== */}
        <div className="modal-header-primary">
          <div className="flex-between">
            <div className="space-x-3-items">
              <FaMapMarkerAlt className="text-2xl" />
              <div>
                <h2 className="text-xl font-bold">
                  {currentRouteData.name || 'Tracking GPS'}
                </h2>
                <p className="text-xs text-white/90">
                  {isTracking ? (isPaused ? 'In pausa' : 'Tracking attivo') : 'Pronto per iniziare'}
                </p>
              </div>
              {waypoints.length > 0 && (
                <div className="ml-4">
                  <div className="bg-white/20 rounded px-2 py-1">
                    <button
                      onClick={() => setShowWaypointsList(!showWaypointsList)}
                      className="flex items-center text-xs text-white"
                    >
                      <span className="mr-1">{waypoints.length} waypoint{waypoints.length > 1 ? 's' : ''}</span>
                      <span style={{ transform: showWaypointsList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                    </button>
                    {showWaypointsList && (
                      <div className="mt-2 space-y-1 text-xs text-white/90">
                        {waypoints.map((wp, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white/10 rounded px-2 py-1">
                            <span className="truncate">{idx + 1}. {wp.name}</span>
                            <button
                              onClick={() => handleRemoveWaypoint(idx)}
                              className="ml-2 text-white/70 hover:text-white"
                            >
                              <FaTimes className="text-xs" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="icon-btn-white"
              aria-label="Chiudi"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* ========== MAPPA ========== */}
        <TrackingMap
          initialCenter={initialCenter}
          currentRouteData={currentRouteData}
          trackPoints={trackPoints}
          waypoints={waypoints}
          tempWaypoint={tempWaypoint}
          currentPosition={currentPosition}
          heading={heading}
          shouldCenterMap={shouldCenterMap}
          recalculatingRoute={recalculatingRoute}
          isTracking={isTracking}
          isSaving={isSaving}
          onMapLongPress={handleMapLongPress}
          onMapReady={handleMapReady}
          onCenterMap={handleCenterMap}
        />

        {/* ========== STATISTICHE ========== */}
        <TrackingStats
          distance={distance}
          elapsedTime={elapsedTime}
          elevationGain={elevationGain}
          elevationLoss={elevationLoss}
          avgSpeed={avgSpeed}
          settings={settings}
          waypoints={waypoints}
          currentRouteData={currentRouteData}
        />

        {/* ========== CONTROLLI ========== */}
        <TrackingControls
          isTracking={isTracking}
          isPaused={isPaused}
          isSaving={isSaving}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onCancel={handleCancel}
        />
      </div>

      {/* ========== DIALOG WAYPOINT ========== */}
      <WaypointDialog
        showWaypointDialog={showWaypointDialog}
        loadingPreview={loadingPreview}
        waypointPreview={waypointPreview}
        onConfirm={handleConfirmWaypoint}
        onCancel={handleCancelWaypoint}
        formatPreviewDistance={formatPreviewDistance}
        formatPreviewDuration={formatPreviewDuration}
      />
    </div>
  )
}

export default ActiveTracking