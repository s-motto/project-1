import { useState, useCallback, useRef } from 'react'
import logger from '../utils/logger'
import { callORS } from '../services/appwriteProxy'
import { reverseGeocode } from '../services/geocodingService'
import { MAX_WAYPOINTS } from '../constants/trackingConstants'

/**
 * Custom hook per gestire i waypoints del tracking GPS
 * Gestisce: aggiunta/rimozione waypoints, preview percorso, ricalcolo con OpenRouteService
 * tramite Appwrite Function proxy
 * 
 * @param {Object} params - Parametri dell'hook
 * @param {Object} params.route - Percorso originale con startPoint, endPoint, coordinates
 * @param {Object} params.currentPosition - Posizione GPS corrente {lat, lng}
 * @param {boolean} params.isTracking - Se il tracking è attivo (per validazione)
 * @param {Object} params.toast - Sistema notifiche toast
 * @param {Object} params.settings - Impostazioni utente (distanceUnit, elevationUnit)
 * @returns {Object} State e handlers per waypoints
 */
export function useWaypointManager({ route, currentPosition, isTracking, toast, settings }) {
  // ========== STATE ==========
  const [waypoints, setWaypoints] = useState([])
  const [tempWaypoint, setTempWaypoint] = useState(null)
  const [showWaypointDialog, setShowWaypointDialog] = useState(false)
  const [waypointPreview, setWaypointPreview] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [recalculatingRoute, setRecalculatingRoute] = useState(false)
  const [showWaypointsList, setShowWaypointsList] = useState(false)

  // ========== REFS ==========
  const originalRouteRef = useRef(normalizeRoute(route))
  const [currentRouteData, setCurrentRouteData] = useState(normalizeRoute(route))

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  /**
   * Normalizza coordinate da GeoJSON [lon, lat] a Leaflet [lat, lon]
   */
  function normalizeRoute(routeData) {
    if (!routeData.coordinates || routeData.coordinates.length === 0) {
      return routeData
    }

    const firstCoord = routeData.coordinates[0]
    const needsConversion = Array.isArray(firstCoord) && firstCoord[0] < firstCoord[1]

    if (needsConversion) {
      return {
        ...routeData,
        coordinates: routeData.coordinates.map(coord => [coord[1], coord[0]])
      }
    }

    return routeData
  }

  // ==========================================
  // API FUNCTIONS
  // ==========================================

  /**
   * Calcola preview del percorso con il nuovo waypoint
   */
  const calculateWaypointPreview = useCallback(async (newWaypoint) => {
    setLoadingPreview(true)

    try {
      // Costruisci array coordinate
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

      // Chiamata OpenRouteService tramite proxy
      const data = await callORS('v2/directions/foot-hiking/geojson', {
        coordinates: coordinates,
        instructions: true,
        language: 'it',
        units: 'km',
        elevation: true
      })

      if (!data.features || data.features.length === 0) {
        throw new Error('Nessun percorso trovato')
      }

      const feature = data.features[0]
      const props = feature.properties

      // Ottieni nome del waypoint
      const name = await reverseGeocode(newWaypoint.lat, newWaypoint.lng)

      const preview = {
        distance: props.summary.distance,
        duration: props.summary.duration,
        name: name,
        coordinates: feature.geometry.coordinates,
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
  }, [currentPosition, route, waypoints, toast])

  /**
   * Ricalcola percorso completo con tutti i waypoints
   */
  const recalculateRouteWithWaypoints = useCallback(async (waypointsToUse = waypoints) => {
    if (waypointsToUse.length === 0) {
      setCurrentRouteData(originalRouteRef.current)
      return
    }

    setRecalculatingRoute(true)

    try {
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

      // API Call tramite proxy
      const data = await callORS('v2/directions/foot-hiking/geojson', {
        coordinates: coordinates,
        instructions: true,
        language: 'it',
        units: 'km',
        elevation: true
      })

      if (!data.features || data.features.length === 0) {
        throw new Error('Nessun percorso trovato')
      }

      const feature = data.features[0]
      const props = feature.properties

      // Aggiorna percorso visualizzato (converti a Leaflet format)
      const newRouteData = {
        ...originalRouteRef.current,
        coordinates: feature.geometry.coordinates.map(c => [c[1], c[0]]),
        distance: props.summary.distance,
        duration: Math.round(props.summary.duration / 60),
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
    if (!isTracking) {
      toast.info('Avvia il tracking per aggiungere waypoints')
      return
    }

    if (waypoints.length >= MAX_WAYPOINTS) {
      toast.warning(`Massimo ${MAX_WAYPOINTS} waypoints consentiti`)
      return
    }

    const tempWp = {
      lat: latlng.lat,
      lng: latlng.lng
    }
    setTempWaypoint(tempWp)
    setShowWaypointDialog(true)
    setWaypointPreview(null)

    await calculateWaypointPreview(tempWp)
  }, [isTracking, waypoints.length, toast, calculateWaypointPreview])

  /**
   * Conferma aggiunta waypoint
   */
  const handleConfirmWaypoint = useCallback(async () => {
    if (!tempWaypoint || !waypointPreview) return

    const newWaypoint = {
      lat: tempWaypoint.lat,
      lng: tempWaypoint.lng,
      name: waypointPreview.name,
      addedAt: new Date().toISOString()
    }

    const updatedWaypoints = [...waypoints, newWaypoint]
    setWaypoints(updatedWaypoints)

    // Usa dati preview già calcolati
    const updatedRoute = {
      ...route,
      coordinates: waypointPreview.coordinates.map(coord => [coord[1], coord[0]]),
      distance: waypointPreview.distance,
      duration: Math.round(waypointPreview.duration / 60),
      ascent: waypointPreview.ascent || 0,
      descent: waypointPreview.descent || 0
    }

    setCurrentRouteData(updatedRoute)
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

    const newWaypoints = waypoints.filter((_, i) => i !== index)
    setWaypoints(newWaypoints)
    toast.info('Waypoint rimosso')

    if (newWaypoints.length === 0) {
      setCurrentRouteData(originalRouteRef.current)
      toast.info('Percorso ripristinato')
    } else {
      await recalculateRouteWithWaypoints(newWaypoints)
    }
  }, [waypoints, toast, recalculateRouteWithWaypoints])

  // ==========================================
  // FORMATTERS
  // ==========================================

  const formatPreviewDistance = useCallback((km) => {
    if (!km) return '---'

    const unit = settings?.distanceUnit || 'km'

    if (unit === 'mi') {
      const miles = km * 0.621371
      return `${miles.toFixed(2)} mi`
    }

    return `${km.toFixed(2)} km`
  }, [settings])

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
    waypoints,
    tempWaypoint,
    showWaypointDialog,
    waypointPreview,
    loadingPreview,
    recalculatingRoute,
    currentRouteData,
    showWaypointsList,
    setShowWaypointsList,
    handleMapLongPress,
    handleConfirmWaypoint,
    handleCancelWaypoint,
    handleRemoveWaypoint,
    formatPreviewDistance,
    formatPreviewDuration
  }
}

export default useWaypointManager