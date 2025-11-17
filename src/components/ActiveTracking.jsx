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
import routesService from '../services/routesService'
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

    if (position.coords.accuracy > (settings?.gpsAccuracyMax || 150)) {
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

      // Primo punto
      if (prevTrackPoints.length === 0) {
        if (newPoint.altitude !== null) {
          lastElevation.current = newPoint.altitude
        }
        return [newPoint]
      }

      // Calcola distanza dal punto precedente
      const lastPoint = prevTrackPoints[prevTrackPoints.length - 1]
      const dist = calculateDistance(
        lastPoint.lat, lastPoint.lng,
        newPoint.lat, newPoint.lng
      )

      // Aggiungi solo se supera la distanza minima
      const minDistance = (settings?.minPointDistanceMeters || 3) / 1000

      if (dist >= minDistance) {
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

        return [...prevTrackPoints, newPoint]
      }

      return prevTrackPoints
    })
  }, [settings?.gpsAccuracyMax, settings?.minPointDistanceMeters])

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

        // 🎮 AGGIORNA ACHIEVEMENTS
        try {
          // Carica percorsi completati aggiornati
          const completedRoutes = await routesService.getCompletedRoutes(user.$id)
          if (completedRoutes.success) {
            // Calcola nuove statistiche
            const statsService = await import('../services/statsService').then(m => m.default)
            const stats = statsService.calculateStats(completedRoutes.data)

            // Aggiorna achievements
            const achievementsService = await import('../services/achievementsService').then(m => m.default)
            const achievementResult = await achievementsService.updateAchievements(user.$id, stats, completedRoutes.data)

            if (achievementResult.success && achievementResult.data.newBadges.length > 0) {
              // Mostra toast per ogni badge sbloccato
              achievementResult.data.newBadges.forEach(badgeId => {
                const badge = achievementsService.getBadgeInfo(badgeId)
                toast.success(`🏆 Badge sbloccato: ${badge.name}!`)
              })
            }

            if (achievementResult.success && achievementResult.data.leveledUp) {
              const levelInfo = achievementsService.getLevelInfo(achievementResult.data.currentLevel)
              toast.success(`🎉 Livello ${levelInfo.level}: ${levelInfo.name}!`)
            }

            // 🔥 Notifiche Streak  
            if (achievementResult.success) {
              if (achievementResult.data.streakLost) {
                toast.error('💔 Streak perso! Riparti da oggi!')
              } else if (achievementResult.data.newStreak > 1) {
                toast.success(`🔥 Streak: ${achievementResult.data.newStreak} giorni consecutivi!`)
              }
            }

            // 🎯 Notifiche Sfide Completate
            if (achievementResult.success && achievementResult.data.challengesCompleted?.length > 0) {
              achievementResult.data.challengesCompleted.forEach(challengeId => {
                const challenges = achievementsService.getAllChallenges()
                const challenge = challenges.find(c => c.id === challengeId)
                if (challenge) {
                  toast.success(`🎯 Sfida completata: ${challenge.name}!`)
                }
              })
            }
          }
        } catch (error) {
          logger.error('Error updating achievements:', error)
        }

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