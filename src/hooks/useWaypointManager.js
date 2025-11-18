import { useState, useCallback, useRef, useMemo } from 'react'
import logger from '../utils/logger'

/**
 * Custom hook per gestire i waypoints del tracking GPS
 * Gestisce: aggiunta/rimozione waypoints, preview percorso, ricalcolo con OpenRouteService
 * 
 * @param {Object} params - Parametri dell'hook
 * @param {Object} params.route - Percorso originale con startPoint, endPoint, coordinates
 * @param {Object} params.currentPosition - Posizione GPS corrente {lat, lng}
 * @param {boolean} params.isTracking - Se il tracking è attivo (per validazione)
 * @param {Object} params.toast - Sistema notifiche toast
 * @param {Object} params.settings - Impostazioni utente (distanceUnit, elevationUnit)
 * @returns {Object} State e handlers per waypoints
 * 
 * @example
 * const {
 *   waypoints,
 *   currentRouteData,
 *   handleMapLongPress,
 *   handleConfirmWaypoint,
 *   handleRemoveWaypoint
 * } = useWaypointManager({
 *   route,
 *   currentPosition,
 *   isTracking,
 *   toast,
 *   settings
 * })
 */
export function useWaypointManager({ route, currentPosition, isTracking, toast, settings }) {
  // ========== STATE ==========
  const [waypoints, setWaypoints] = useState([]) // Array waypoints confermati
  const [tempWaypoint, setTempWaypoint] = useState(null) // Waypoint temporaneo (durante selezione)
  const [showWaypointDialog, setShowWaypointDialog] = useState(false) // Mostra dialog conferma
  const [waypointPreview, setWaypointPreview] = useState(null) // Preview dati percorso
  const [loadingPreview, setLoadingPreview] = useState(false) // Loading preview
  const [recalculatingRoute, setRecalculatingRoute] = useState(false) // Loading ricalcolo
  const [showWaypointsList, setShowWaypointsList] = useState(false) // Mostra lista waypoints nell'header

  // ========== REFS ==========
  // Salva percorso originale per reset
  const originalRouteRef = useRef(normalizeRoute(route))

  // Percorso corrente visualizzato (può cambiare con waypoints)
  const [currentRouteData, setCurrentRouteData] = useState(normalizeRoute(route))

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  /**
   * Normalizza coordinate da GeoJSON [lon, lat] a Leaflet [lat, lon]
   * OpenRouteService restituisce coordinate in formato GeoJSON
   */
  function normalizeRoute(routeData) {
    if (!routeData.coordinates || routeData.coordinates.length === 0) {
      return routeData
    }

    const firstCoord = routeData.coordinates[0]
    // Se primo valore < secondo, sono [lon, lat] e vanno invertite
    const needsConversion = Array.isArray(firstCoord) && firstCoord[0] < firstCoord[1]

    if (needsConversion) {
      return {
        ...routeData,
        coordinates: routeData.coordinates.map(coord => [coord[1], coord[0]])
      }
    }

    return routeData
  }

  /**
   * Reverse Geocoding: ottiene nome luogo da coordinate
   * Usa OpenRouteService reverse geocoding API
   */
  const reverseGeocode = useCallback(async (lat, lng) => {
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
  }, [])

  /**
   * Calcola preview del percorso con il nuovo waypoint
   * Chiama OpenRouteService per ottenere distanza, durata, coordinate
   */
  const calculateWaypointPreview = useCallback(async (newWaypoint) => {
    setLoadingPreview(true)

    try {
      const ORS_KEY = import.meta.env.VITE_OPENROUTE_API_KEY

      // Costruisci array coordinate per API
      const coordinates = []

      // 1. Start: posizione corrente o start originale
      if (currentPosition) {
        coordinates.push([currentPosition.lng, currentPosition.lat])
      } else {
        coordinates.push([route.startPoint.lon, route.startPoint.lat])
      }

      // 2. Waypoints esistenti
      waypoints.forEach(wp => {
        coordinates.push([wp.lng, wp.lat])
      })

      // 3. Nuovo waypoint
      coordinates.push([newWaypoint.lng, newWaypoint.lat])

      // 4. End
      coordinates.push([route.endPoint.lon, route.endPoint.lat])

      // Chiamata OpenRouteService
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

      if (!data.features || data.features.length === 0) {
        throw new Error('Nessun percorso trovato')
      }

      const feature = data.features[0]
      const props = feature.properties

      // Ottieni nome del waypoint
      const name = await reverseGeocode(newWaypoint.lat, newWaypoint.lng)

      const preview = {
        distance: props.summary.distance, // km
        duration: props.summary.duration, // secondi
        name: name,
        coordinates: feature.geometry.coordinates, // GeoJSON format [lon, lat]
        ascent: props.ascent || 0,
        descent: props.descent || 0
      }

      setWaypointPreview(preview)
      setLoadingPreview(false)
      return preview
    } catch (error) {
      logger.error('Waypoint preview error:', error)
      toast.error('Errore nel calcolo del percorso')
      setLoadingPreview(false)
      return null
    }
  }, [currentPosition, route, waypoints, reverseGeocode, toast])

  /**
   * Ricalcola percorso completo con tutti i waypoints
   * Aggiorna currentRouteData
   */
  const recalculateRouteWithWaypoints = useCallback(async (waypointsToUse = waypoints) => {
    // Se nessun waypoint, usa percorso originale
    if (waypointsToUse.length === 0) {
      setCurrentRouteData(originalRouteRef.current)
      return
    }

    setRecalculatingRoute(true)

    try {
      const ORS_KEY = import.meta.env.VITE_OPENROUTE_API_KEY

      // Costruisci coordinate
      const coordinates = []

      // Start
      if (currentPosition) {
        coordinates.push([currentPosition.lng, currentPosition.lat])
      } else {
        coordinates.push([route.startPoint.lon, route.startPoint.lat])
      }

      // Waypoints
      waypointsToUse.forEach(wp => {
        coordinates.push([wp.lng, wp.lat])
      })

      // End
      coordinates.push([route.endPoint.lon, route.endPoint.lat])

      // API Call
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

      if (!data.features || data.features.length === 0) {
        throw new Error('Nessun percorso trovato')
      }

      const feature = data.features[0]
      const props = feature.properties

      // Aggiorna percorso visualizzato (converti a Leaflet format)
      const newRouteData = {
        ...originalRouteRef.current,
        coordinates: feature.geometry.coordinates.map(c => [c[1], c[0]]), // [lat, lon]
        distance: props.summary.distance,
        duration: Math.round(props.summary.duration / 60), // minuti
        ascent: props.ascent || 0,
        descent: props.descent || 0
      }

      setCurrentRouteData(newRouteData)
      setRecalculatingRoute(false)
      toast.success('Percorso aggiornato con waypoint!')
    } catch (error) {
      logger.error('Route recalculation error:', error)
      toast.error('Errore nel ricalcolo del percorso')
      setRecalculatingRoute(false)
    }
  }, [currentPosition, route, waypoints, toast])

  // ==========================================
  // HANDLERS
  // ==========================================

  /**
   * Gestisce long press sulla mappa per aggiungere waypoint
   */
  const handleMapLongPress = useCallback(async (latlng) => {
    // Validazioni
    if (!isTracking) {
      toast.info('Avvia il tracking per aggiungere waypoints')
      return
    }

    if (waypoints.length >= 5) {
      toast.warning('Massimo 5 waypoints consentiti')
      return
    }

    // Salva waypoint temporaneo
    const tempWp = {
      lat: latlng.lat,
      lng: latlng.lng
    }
    setTempWaypoint(tempWp)

    // Mostra dialog
    setShowWaypointDialog(true)
    setWaypointPreview(null)

    // Calcola preview
    await calculateWaypointPreview(tempWp)
  }, [isTracking, waypoints.length, toast, calculateWaypointPreview])

  /**
   * Conferma aggiunta waypoint
   */
  const handleConfirmWaypoint = useCallback(async () => {
    if (!tempWaypoint || !waypointPreview) return

    // Aggiungi waypoint con dati del preview
    const newWaypoint = {
      lat: tempWaypoint.lat,
      lng: tempWaypoint.lng,
      name: waypointPreview.name,
      addedAt: new Date().toISOString()
    }

    const updatedWaypoints = [...waypoints, newWaypoint]
    setWaypoints(updatedWaypoints)

    // Usa dati preview già calcolati per aggiornare percorso
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
  }, [tempWaypoint, waypointPreview, waypoints, route, toast])

  /**
   * Annulla aggiunta waypoint
   */
  const handleCancelWaypoint = useCallback(() => {
    setShowWaypointDialog(false)
    setTempWaypoint(null)
    setWaypointPreview(null)
  }, [])

  /**
   * Rimuove waypoint dalla lista
   */
  const handleRemoveWaypoint = useCallback(async (index) => {
    const waypointToRemove = waypoints[index]
    
    if (!confirm(`Rimuovere il waypoint "${waypointToRemove.name}"?`)) {
      return
    }

    // Rimuovi waypoint
    const newWaypoints = waypoints.filter((_, i) => i !== index)
    setWaypoints(newWaypoints)

    toast.info('Waypoint rimosso')

    // Se nessun waypoint, ripristina percorso originale
    if (newWaypoints.length === 0) {
      setCurrentRouteData(originalRouteRef.current)
      toast.info('Percorso ripristinato')
    } else {
      // Ricalcola con waypoints rimanenti
      await recalculateRouteWithWaypoints(newWaypoints)
    }
  }, [waypoints, toast, recalculateRouteWithWaypoints])

  // ==========================================
  // FORMATTERS
  // ==========================================

  /**
   * Formatta distanza per preview (con unità utente)
   */
  const formatPreviewDistance = useCallback((km) => {
    if (!km) return '---'

    const unit = settings?.distanceUnit || 'km'

    if (unit === 'mi') {
      const miles = km * 0.621371
      return `${miles.toFixed(2)} mi`
    }

    return `${km.toFixed(2)} km`
  }, [settings])

  /**
   * Formatta durata per preview (secondi → ore/minuti)
   */
  const formatPreviewDuration = useCallback((seconds) => {
    if (!seconds) return '---'

    const minutes = Math.round(seconds / 60)

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}h ${mins}min`
    }

    return `${minutes}min`
  }, [])

  // ==========================================
  // RETURN
  // ==========================================

  return {
    // State
    waypoints,
    tempWaypoint,
    showWaypointDialog,
    waypointPreview,
    loadingPreview,
    recalculatingRoute,
    currentRouteData,
    showWaypointsList,
    
    // Setters
    setShowWaypointsList,
    
    // Handlers
    handleMapLongPress,
    handleConfirmWaypoint,
    handleCancelWaypoint,
    handleRemoveWaypoint,
    
    // Formatters
    formatPreviewDistance,
    formatPreviewDuration
  }
}

export default useWaypointManager