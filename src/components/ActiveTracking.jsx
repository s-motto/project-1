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

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  FaPlay,
  FaPause,
  FaStop,
  FaTimes,
  FaMapMarkerAlt,
  FaSpinner
} from 'react-icons/fa'

// Services e utilities
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useSettings } from '../contexts/SettingsContext'
import useGeolocation from '../hooks/useGeolocation'
import routesService from '../services/routesService'
import logger from '../utils/logger'
import {
  calculateDistance,
  calculateSpeed,
  formatDistance,
  formatSpeedKmh,
  formatElevation,
  formatDurationSeconds
} from '../utils/gpsUtils'

// Componente helper per long press
import MapLongPressHandler from './MapLongPressHandler'

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
  const [elapsedTime, setElapsedTime] = useState(0) // Tempo trascorso (secondi)
  const [elevationGain, setElevationGain] = useState(0) // Salita accumulata (m)
  const [elevationLoss, setElevationLoss] = useState(0) // Discesa accumulata (m)
  const [heading, setHeading] = useState(0) // Direzione movimento (gradi)
  const [gpsAccuracy, setGpsAccuracy] = useState(null) // Accuratezza GPS (metri)
  const [waitingForGoodFix, setWaitingForGoodFix] = useState(false)
  const [shouldCenterMap, setShouldCenterMap] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedRouteId, setSavedRouteId] = useState(route.savedId || null)

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
      console.log('[ActiveTracking] Converting coordinates from GeoJSON [lon,lat] to Leaflet [lat,lon]')
      return {
        ...routeData,
        coordinates: routeData.coordinates.map(coord => [coord[1], coord[0]])
      }
    }

    console.log('[ActiveTracking] Coordinates already in Leaflet format [lat,lon]')
    return routeData
  }

  const normalizedRoute = useMemo(() => normalizeRoute(route), [route])
  const originalRouteRef = useRef(normalizedRoute) // Salva percorso originale per reset
  const [currentRouteData, setCurrentRouteData] = useState(normalizedRoute) // Percorso visualizzato (può cambiare con waypoints)
  const [showWaypointsList, setShowWaypointsList] = useState(false) // Mostra/nascondi lista waypoints

  // ========== REFS ==========
  const isTrackingRef = useRef(false)
  const isPausedRef = useRef(false)
  const startTimeRef = useRef(null)
  const pausedTimeRef = useRef(0)
  const timerRef = useRef(null)
  const mapRef = useRef(null)
  const lastElevation = useRef(null)

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

      // Chiamata API OpenRouteService
      const response = await fetch(
        'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson',
        {
          method: 'POST',
          headers: {
            'Authorization': ORS_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            coordinates: coordinates,
            instructions: true,
            language: 'it',
            units: 'km',
            elevation: true
          })
        }
      )

      if (!response.ok) {
        throw new Error('Errore nel calcolo del percorso')
      }

      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const props = feature.properties

        // Ottieni nome del waypoint
        const name = await reverseGeocode(newWaypoint.lat, newWaypoint.lng)

        return {
          distance: props.summary.distance, // km
          duration: props.summary.duration, // secondi
          name: name,
          coordinates: feature.geometry.coordinates,
          ascent: props.ascent || 0,
          descent: props.descent || 0
        }
      }

      throw new Error('Nessun percorso trovato')

    } catch (error) {
      logger.error('Error calculating waypoint preview:', error)
      toast.error('Errore nel calcolo del percorso con waypoint')
      return null
    } finally {
      setLoadingPreview(false)
    }
  }

  /**
   * Ricalcola il percorso completo con tutti i waypoints
   * Aggiorna currentRouteData con il nuovo percorso
   * 
   * @param {Array} waypointsToUse - Optional array of waypoints to use (defaults to current state)
   * Viene chiamato dopo la conferma del waypoint
   */
  const recalculateRouteWithWaypoints = async (waypointsToUse = null) => {
    setRecalculatingRoute(true)

    try {
      const ORS_KEY = import.meta.env.VITE_OPENROUTE_API_KEY

      // Usa i waypoints passati o quelli nello state
      const wps = waypointsToUse || waypoints

      // Costruisci coordinate
      const coordinates = []

      // Posizione corrente o start originale
      if (currentPosition) {
        coordinates.push([currentPosition.lng, currentPosition.lat])
      } else {
        coordinates.push([route.startPoint.lon, route.startPoint.lat])
      }

      // Tutti i waypoints
      wps.forEach(wp => {
        coordinates.push([wp.lng, wp.lat])
      })

      // Destinazione
      coordinates.push([route.endPoint.lon, route.endPoint.lat])

      // Chiamata API
      const response = await fetch(
        'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson',
        {
          method: 'POST',
          headers: {
            'Authorization': ORS_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            coordinates: coordinates,
            instructions: true,
            language: 'it',
            units: 'km',
            elevation: true
          })
        }
      )

      if (!response.ok) {
        throw new Error('Errore nel ricalcolo del percorso')
      }

      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const props = feature.properties

        // Aggiorna route data
        const updatedRoute = {
          ...route,
          coordinates: feature.geometry.coordinates.map(coord => [coord[1], coord[0]]), // [lat, lon]
          distance: props.summary.distance,
          duration: Math.round(props.summary.duration / 60), // minuti
          ascent: props.ascent || 0,
          descent: props.descent || 0,
          instructions: props.segments.flatMap(seg =>
            seg.steps.map(step => ({
              instruction: step.instruction,
              distance: step.distance,
              duration: step.duration
            }))
          )
        }

        setCurrentRouteData(updatedRoute)
        toast.success('Percorso aggiornato con successo!')

      } else {
        throw new Error('Nessun percorso trovato')
      }

    } catch (error) {
      logger.error('Error recalculating route:', error)
      toast.error('Errore nel ricalcolo del percorso')
    } finally {
      setRecalculatingRoute(false)
    }
  }

  // ==========================================
  // WAYPOINT HANDLERS
  // ==========================================

  /**
   * Handler chiamato quando l'utente fa long press sulla mappa
   * 
   * Logica:
   * 1. Verifica che il tracking sia attivo
   * 2. Verifica che non ci siano già 5 waypoints
   * 3. Salva waypoint temporaneo
   * 4. Calcola preview
   * 5. Mostra dialog
   * 
   * @param {Object} latlng - Coordinate Leaflet {lat, lng}
   */
  const handleMapLongPress = async (latlng) => {
    // Validazioni
    if (!isTracking) {
      toast.info('Avvia il tracking per aggiungere waypoints')
      return
    }

    if (waypoints.length >= 5) {
      toast.warning('Massimo 5 waypoints raggiunto')
      return
    }

    // Salva waypoint temporaneo
    const tempWp = {
      lat: latlng.lat,
      lng: latlng.lng
    }
    setTempWaypoint(tempWp)

    // Mostra dialog con loading
    setShowWaypointDialog(true)
    setWaypointPreview(null)

    // Calcola preview
    const preview = await calculateWaypointPreview(tempWp)

    if (preview) {
      setWaypointPreview(preview)
    } else {
      // Se fallisce, chiudi dialog
      setShowWaypointDialog(false)
      setTempWaypoint(null)
    }
  }

  /**
   * Conferma l'aggiunta del waypoint
   * Aggiunge il waypoint all'array e usa i dati del preview già calcolati
   */
  const handleConfirmWaypoint = async () => {
    if (!tempWaypoint || !waypointPreview) return

    // Aggiungi waypoint
    const newWaypoint = {
      lat: tempWaypoint.lat,
      lng: tempWaypoint.lng,
      name: waypointPreview.name,
      addedAt: new Date().toISOString()
    }

    const updatedWaypoints = [...waypoints, newWaypoint]
    setWaypoints(updatedWaypoints)

    // Usa i dati del preview già calcolati per aggiornare il percorso
    const updatedRoute = {
      ...route,
      coordinates: waypointPreview.coordinates.map(coord => [coord[1], coord[0]]), // [lat, lon]
      distance: waypointPreview.distance,
      duration: Math.round(waypointPreview.duration / 60), // minuti
      ascent: waypointPreview.ascent || 0,
      descent: waypointPreview.descent || 0
    }

    setCurrentRouteData(updatedRoute)

    // Chiudi dialog
    setShowWaypointDialog(false)
    setTempWaypoint(null)
    setWaypointPreview(null)

    toast.success(`Waypoint "${newWaypoint.name}" aggiunto!`)
  }

  /**
   * Annulla l'aggiunta del waypoint
   */
  const handleCancelWaypoint = () => {
    setShowWaypointDialog(false)
    setTempWaypoint(null)
    setWaypointPreview(null)
  }

  /**
   * Rimuove un waypoint dalla lista
   * 
   * @param {Number} index - Indice del waypoint da rimuovere
   */
  const handleRemoveWaypoint = async (index) => {
    if (!confirm(`Rimuovere il waypoint "${waypoints[index].name}"?`)) {
      return
    }

    // Rimuovi waypoint
    const newWaypoints = waypoints.filter((_, i) => i !== index)
    setWaypoints(newWaypoints)

    toast.info('Waypoint rimosso')

    // Se non ci sono più waypoints, torna al percorso originale
    if (newWaypoints.length === 0) {
      setCurrentRouteData(originalRouteRef.current)
      toast.info('Percorso ripristinato')
    } else {
      // Ricalcola con i waypoints rimanenti, passando l'array aggiornato
      recalculateRouteWithWaypoints(newWaypoints)
    }
  }

  /**
   * Formatta la distanza per la preview
   */
  const formatPreviewDistance = (km) => {
    if (!km) return '---'

    const unit = settings?.distanceUnit || 'km'

    if (unit === 'mi') {
      const miles = km * 0.621371
      return `${miles.toFixed(2)} mi`
    }

    return `${km.toFixed(2)} km`
  }

  /**
   * Formatta la durata per la preview
   */
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
  const handlePositionUpdate = (position) => {
    const newPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      altitude: position.coords.altitude,
      timestamp: position.timestamp,
      accuracy: position.coords.accuracy
    }

    setCurrentPosition(newPoint)

    // Calcola direzione dal movimento
    if (trackPoints.length > 0 && !isPausedRef.current && isTrackingRef.current) {
      const lastPoint = trackPoints[trackPoints.length - 1]
      const lat1 = lastPoint.lat * Math.PI / 180
      const lat2 = newPoint.lat * Math.PI / 180
      const dLon = (newPoint.lng - lastPoint.lng) * Math.PI / 180

      const y = Math.sin(dLon) * Math.cos(lat2)
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
      const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360

      setHeading(bearing)
    }

    setGpsAccuracy(position.coords.accuracy)

    // Se accuracy è buona, considera GPS "fixed"
    if (position.coords.accuracy < (settings?.gpsAccuracyMax || 50)) {
      setWaitingForGoodFix(false)
    }

    // Se in pausa o non tracking, non registrare punti
    if (!isTrackingRef.current || isPausedRef.current) return

    // Ignora punti con accuratezza troppo bassa
    if (position.coords.accuracy > (settings?.gpsAccuracyMax || 50)) {
      logger.warn('GPS accuracy too low:', position.coords.accuracy)
      return
    }

    // Aggiungi punto alla traccia
    if (trackPoints.length === 0) {
      // Primo punto
      setTrackPoints([newPoint])
      if (newPoint.altitude !== null) {
        lastElevation.current = newPoint.altitude
      }
    } else {
      const lastPoint = trackPoints[trackPoints.length - 1]

      // Calcola distanza dal punto precedente
      const dist = calculateDistance(
        lastPoint.lat, lastPoint.lng,
        newPoint.lat, newPoint.lng
      )

      // Aggiungi solo se supera la distanza minima (default 5m)
      const minDistance = (settings?.minPointDistanceMeters || 5) / 1000 // converti in km

      if (dist >= minDistance) {
        setTrackPoints(prev => [...prev, newPoint])
        setDistance(prev => prev + dist)

        // Calcola dislivello
        if (newPoint.altitude !== null && lastElevation.current !== null) {
          const elevDiff = newPoint.altitude - lastElevation.current

          if (elevDiff > 0) {
            setElevationGain(prev => prev + elevDiff)
          } else if (elevDiff < 0) {
            setElevationLoss(prev => prev + Math.abs(elevDiff))
          }

          lastElevation.current = newPoint.altitude
        }
      }
    }
  }

  /**
   * Gestisce errori GPS
   */
  const handlePositionError = (error) => {
    let errorMsg = 'Errore GPS: '

    if (error.code === 1) {
      errorMsg += 'Abilita il GPS nelle impostazioni del browser.'
    } else if (error.code === 2) {
      errorMsg += 'Posizione non disponibile. Sei all\'aperto?'
    } else if (error.code === 3) {
      errorMsg += 'Timeout. Il GPS impiega troppo tempo.'
    } else {
      errorMsg += error.message
    }

    toast.error(errorMsg)
  }

  /**
   * Salva il percorso se non già salvato
   */
  const ensureRouteSaved = async () => {
    if (savedRouteId) {
      return savedRouteId
    }

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

  /**
   * Avvia tracking
   */
  const handleStart = async () => {
    if (!isTracking) {
      // Se il percorso non è salvato, salvalo
      if (!savedRouteId) {
        try {
          await ensureRouteSaved()
          toast.info('Percorso salvato automaticamente per il tracking')
        } catch (error) {
          toast.error('Errore nel salvare il percorso: ' + error.message)
        }
      }

      // Avvia tracking
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

  /**
   * Pausa tracking
   */
  const handlePause = () => {
    if (!isPaused) {
      const now = Date.now()
      pausedTimeRef.current += now - startTimeRef.current - elapsedTime * 1000
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

    setIsSaving(true)

    try {
      // Ferma GPS
      geolocation.stop()
      setIsTracking(false)
      isTrackingRef.current = false

      // Assicura che il percorso sia salvato
      const routeId = await ensureRouteSaved()

      // Prepara dati da salvare
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
      logger.error('Error saving track:', error)
      toast.error('Errore nel salvare il percorso: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Annulla tracking
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
  // COMPONENTI HELPER
  // ==========================================

  /**
   * Componente per auto-centrare la mappa sulla posizione corrente
   * Si disabilita automaticamente quando l'utente muove la mappa
   */
  const MapCenterController = ({ position, shouldCenter, onMapReady, onDisableCenter }) => {
    const map = useMap()

    useEffect(() => {
      if (onMapReady) onMapReady(map)
    }, [map, onMapReady])

    // Rileva quando l'utente muove la mappa manualmente
    useEffect(() => {
      if (!map || !onDisableCenter) return

      const handleUserInteraction = () => {
        onDisableCenter()
      }

      // Ascolta tutti gli eventi di interazione utente
      map.on('dragstart', handleUserInteraction)
      map.on('zoomstart', handleUserInteraction)

      return () => {
        map.off('dragstart', handleUserInteraction)
        map.off('zoomstart', handleUserInteraction)
      }
    }, [map, onDisableCenter])

    useEffect(() => {
      if (shouldCenter && position) {
        map.setView([position.lat, position.lng], map.getZoom())
      }
    }, [position, shouldCenter, map])

    return null
  }

  /**
   * Dialog di conferma waypoint
   * Mostra preview del percorso con distanza e tempo stimati
   */
  const WaypointDialog = () => {
    if (!showWaypointDialog) return null

    return (
      <div className="modal-overlay" style={{ zIndex: 2000 }}>
        <div
          className="card mx-4"
          style={{
            maxWidth: '320px',
            padding: '1rem',
            margin: '0 auto',
            marginTop: '25vh',
            boxShadow: 'var(--shadow-xl)'
          }}
        >
          {/* Header */}
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-xl">📍</span>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Aggiungi Waypoint?
            </h3>
          </div>

          {/* Contenuto */}
          {loadingPreview ? (
            // Loading
            <div className="flex flex-col items-center py-4 space-y-2">
              <FaSpinner className="spinner text-xl" style={{ color: 'var(--color-green)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Calcolo percorso...
              </p>
            </div>
          ) : waypointPreview ? (
            // Preview caricata
            <div className="space-y-2">
              {/* Nome del luogo */}
              <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {waypointPreview.name}
              </div>

              {/* Statistiche preview */}
              <div
                className="flex items-center justify-around py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="text-center">
                  <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                    Distanza
                  </div>
                  <div className="font-bold text-xs" style={{ color: 'var(--icon-distance)' }}>
                    📏 {formatPreviewDistance(waypointPreview.distance)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                    Tempo
                  </div>
                  <div className="font-bold text-xs" style={{ color: 'var(--icon-duration)' }}>
                    ⏱️ {formatPreviewDuration(waypointPreview.duration)}
                  </div>
                </div>
              </div>

              {/* Info */}
              <p className="text-xs text-center" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                Il percorso verrà ricalcolato con questo waypoint
              </p>
            </div>
          ) : (
            // Errore
            <div className="text-center py-3">
              <p className="text-xs" style={{ color: 'var(--status-error)' }}>
                Errore nel calcolo del percorso
              </p>
            </div>
          )}

          {/* Bottoni */}
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleCancelWaypoint}
              className="btn-secondary flex-1"
              style={{ padding: '0.5rem' }}
              disabled={loadingPreview}
            >
              Annulla
            </button>
            <button
              onClick={handleConfirmWaypoint}
              className="btn-primary flex-1"
              style={{ padding: '0.5rem' }}
              disabled={loadingPreview || !waypointPreview}
            >
              Conferma
            </button>
          </div>
        </div>
      </div>
    )
  }

  /**
   * Lista waypoints attivi
   * Mostrata in alto a destra, design minimale per mobile
   */
  const WaypointsList = () => {
    if (waypoints.length === 0) return null

    return (
      <div
        className="card absolute top-16 right-2 z-[1000]"
        style={{
          maxWidth: '160px',
          fontSize: '0.65rem',
          padding: '0.4rem',
          backgroundColor: 'var(--bg-card)',
          opacity: 0.95
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1 pb-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <span className="font-bold" style={{ color: 'var(--text-primary)', fontSize: '0.65rem' }}>
            🎯 Waypoints ({waypoints.length}/5)
          </span>
        </div>

        {/* Lista */}
        <div className="space-y-1">
          {waypoints.map((wp, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-1 rounded transition-colors"
              style={{
                ':hover': { backgroundColor: 'var(--bg-secondary)' }
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {/* Numero e nome */}
              <div className="flex items-center space-x-1 flex-1 min-w-0">
                <span className="font-bold" style={{ color: 'var(--icon-distance)', fontSize: '0.65rem' }}>
                  {index + 1}.
                </span>
                <span className="truncate" style={{ color: 'var(--text-primary)', fontSize: '0.6rem' }}>
                  {wp.name}
                </span>
              </div>

              {/* Bottone rimuovi */}
              <button
                onClick={() => handleRemoveWaypoint(index)}
                className="ml-1 p-1 rounded transition-colors"
                style={{ color: 'var(--status-error)', fontSize: '0.6rem' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title="Rimuovi waypoint"
              >
                <FaTimes />
              </button>
            </div>
          ))}
        </div>

        {/* Hint */}
        {waypoints.length < 5 && (
          <div className="mt-1 pt-1 border-t" style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '0.6rem'
          }}>
            💡 Tieni premuto sulla mappa
          </div>
        )}
      </div>
    )
  }

  // ==========================================
  // CALCOLI STATISTICHE
  // ==========================================
  const avgSpeed = calculateSpeed(distance, elapsedTime)
  const distanceLabel = formatDistance(distance, settings?.distanceUnit || 'km')
  const speedLabel = formatSpeedKmh(avgSpeed, settings?.distanceUnit || 'km')
  const gainLabel = formatElevation(elevationGain, settings?.elevationUnit || 'm')

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
                  {isTracking ? (isPaused ? 'In pausa' : 'In corso') : 'Pronto'}
                </p>
                {/* Waypoints collassabili nell'header */}
                {waypoints.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => setShowWaypointsList(!showWaypointsList)}
                      className="flex items-center space-x-2 text-xs text-white/90 hover:text-white"
                    >
                      <span>🎯 Waypoints ({waypoints.length}/5)</span>
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
                )}
              </div>
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
        <div className="flex-1 relative">
          <MapContainer
            center={initialCenter}
            zoom={14}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Long Press Handler - Abilita waypoints */}
            <MapLongPressHandler
              onLongPress={handleMapLongPress}
              disabled={!isTracking || isSaving}
            />

            {/* Percorso pianificato (BLU TRATTEGGIATO) */}
            {useMemo(() => {
              if (!currentRouteData.coordinates || currentRouteData.coordinates.length === 0) {
                return null
              }

              return (
                <Polyline
                  key={`route-${waypoints.length}`}
                  positions={currentRouteData.coordinates}
                  color="#2563eb"
                  weight={4}
                  opacity={0.6}
                  dashArray="5, 10"
                />
              )
            }, [currentRouteData.coordinates, waypoints.length])}

            {/* Waypoints markers (ARANCIONI NUMERATI) */}
            {waypoints.map((wp, index) => (
              <Marker
                key={`waypoint-${index}`}
                position={[wp.lat, wp.lng]}
                icon={L.divIcon({
                  html: `
                    <div style="
                      background: #f97316;
                      color: white;
                      border: 3px solid white;
                      border-radius: 50%;
                      width: 30px;
                      height: 30px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-weight: bold;
                      font-size: 13px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    ">
                      ${index + 1}
                    </div>
                  `,
                  className: 'waypoint-marker',
                  iconSize: [30, 30],
                  iconAnchor: [15, 15]
                })}
              />
            ))}

            {/* Marker temporaneo (GIALLO PULSANTE) */}
            {tempWaypoint && (
              <Marker
                position={[tempWaypoint.lat, tempWaypoint.lng]}
                icon={L.divIcon({
                  html: `
                    <div style="
                      background: #eab308;
                      color: white;
                      border: 3px solid white;
                      border-radius: 50%;
                      width: 34px;
                      height: 34px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 16px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                      animation: pulse 1.5s ease-in-out infinite;
                    ">
                      ?
                    </div>
                    <style>
                      @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                      }
                    </style>
                  `,
                  className: 'temp-waypoint-marker',
                  iconSize: [34, 34],
                  iconAnchor: [17, 17]
                })}
              />
            )}

            {/* Traccia GPS (VERDE) - mai modificata */}
            {useMemo(() => {
              if (trackPoints.length < 2) return null
              return (
                <Polyline
                  key={`track-${trackPoints.length}`}
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
              <Marker
                position={[currentPosition.lat, currentPosition.lng]}
                icon={L.divIcon({
                  html: `
                    <div style="transform: rotate(${heading || 0}deg); width: 36px; height: 36px;">
                      <svg viewBox="0 0 24 24" width="36" height="36">
                        <path fill="#2563eb" stroke="#fff" stroke-width="2" 
                              d="M12 2 L4 22 L12 18 L20 22 Z"/>
                        <circle cx="12" cy="12" r="3" fill="#fff"/>
                      </svg>
                    </div>
                  `,
                  className: 'custom-gps-marker',
                  iconSize: [36, 36],
                  iconAnchor: [18, 18]
                })}
              />
            )}

            {/* Auto-center */}
            {currentPosition && (
              <MapCenterController
                position={currentPosition}
                shouldCenter={shouldCenterMap}
                onMapReady={handleMapReady}
                onDisableCenter={() => setShouldCenterMap(false)}
              />
            )}
          </MapContainer>




          {/* ========== BOTTONE RICENTRA ========== */}
          {isTracking && !shouldCenterMap && (
            <button
              onClick={() => setShouldCenterMap(true)}
              className="card absolute bottom-4 right-4 z-[1000] p-2 flex items-center space-x-2 hover:scale-105 transition-transform"
              style={{
                backgroundColor: 'var(--bg-card)',
                boxShadow: 'var(--shadow-xl)',
                cursor: 'pointer'
              }}
              title="Ricentra sulla posizione"
            >
              <span className="text-2xl">🎯</span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                Centra
              </span>
            </button>
          )}

          {/* ========== LOADING RICALCOLO ========== */}
          {recalculatingRoute && (
            <div className="card absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1500] p-3 flex items-center space-x-2">
              <FaSpinner className="spinner text-lg" style={{ color: 'var(--color-green)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Ricalcolo...
              </span>
            </div>
          )}
        </div>

        {/* ========== STATISTICHE ========== */}
        <div
          className="card border-t"
          style={{
            borderColor: 'var(--border-color)',
            padding: '0.75rem'
          }}
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Distanza */}
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                Distanza
              </p>
              <p className="text-base font-bold" style={{ color: 'var(--icon-distance)' }}>
                {distanceLabel}
              </p>
              {waypoints.length > 0 && (
                <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
                  Piano: {formatDistance(currentRouteData.distance, settings?.distanceUnit || 'km')}
                </p>
              )}
            </div>

            {/* Tempo */}
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                Tempo
              </p>
              <p className="text-base font-bold" style={{ color: 'var(--icon-duration)' }}>
                {formatDurationSeconds(elapsedTime, settings?.durationFormat || 'hms')}
              </p>
              {waypoints.length > 0 && (
                <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
                  Stima: {Math.round(currentRouteData.duration)}min
                </p>
              )}
            </div>

            {/* Velocità */}
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                Velocità
              </p>
              <p className="text-base font-bold" style={{ color: 'var(--icon-distance)' }}>
                {speedLabel}
              </p>
            </div>
          </div>

          {/* Dislivelli */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-center">
              <p className="mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                ↗ Salita
              </p>
              <p className="text-sm font-bold" style={{ color: 'var(--icon-ascent)' }}>
                {gainLabel}
              </p>
              {waypoints.length > 0 && (
                <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
                  Piano: {formatElevation(currentRouteData.ascent, settings?.elevationUnit || 'm')}
                </p>
              )}
            </div>
            <div className="text-center">
              <p className="mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                ↘ Discesa
              </p>
              <p className="text-sm font-bold" style={{ color: 'var(--icon-descent)' }}>
                {formatElevation(elevationLoss, settings?.elevationUnit || 'm')}
              </p>
              {waypoints.length > 0 && (
                <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
                  Piano: {formatElevation(currentRouteData.descent, settings?.elevationUnit || 'm')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========== CONTROLLI ========== */}
        <div
          className="card border-t flex-center space-x-2"
          style={{
            borderColor: 'var(--border-color)',
            padding: '0.75rem',
            flexShrink: 0
          }}
        >
          {!isTracking ? (
            <button
              onClick={handleStart}
              className="btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              <FaPlay className="mr-1" /> Avvia
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  <FaPause className="mr-1" /> Pausa
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="btn-primary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  <FaPlay className="mr-1" /> Riprendi
                </button>
              )}
              <button
                onClick={handleStop}
                className="btn-danger"
                disabled={isSaving}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                {isSaving ? (
                  <>
                    <FaSpinner className="spinner mr-1" />
                    Salvo...
                  </>
                ) : (
                  <>
                    <FaStop className="mr-1" />
                    Fine
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                <FaTimes className="mr-1" /> Annulla
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========== DIALOG WAYPOINT ========== */}
      <WaypointDialog />
    </div>
  )
}

export default ActiveTracking