import { useCallback } from 'react'
import L from 'leaflet'
import { createMapMarker, createMarkersUpdateListener, MarkerType } from '../utils/mapMarkers'
import { calculateDistance } from '../utils/gpsUtils'
import logger from '../utils/logger'

/**
 * Custom hook per gestire il caricamento e la visualizzazione dei percorsi
 * Supporta sia percorsi salvati che percorsi hiking da Overpass
 * 
 * @param {Object} map - Istanza della mappa Leaflet
 * @param {Object} refs - Oggetto contenente i ref necessari
 * @param {Object} setters - Oggetto contenente i setter degli stati
 * @returns {Object} Funzioni loadSavedRoute e loadHikingRoute
 */
export const useRouteLoader = (map, refs, setters) => {
  const {
    routeLayerRef,
    startMarkerRef,
    endMarkerRef,
    updateMarkersListenerRef
  } = refs

  const {
    setStartPoint,
    setEndPoint,
    setStartText,
    setEndText,
    setRouteInfo,
    setInstructions,
    setFullRouteData,
    setIsPreloaded,
    setRouteSaved,
    setRouteLayer,
    setErrorMsg
  } = setters

  /**
   * Funzione helper per pulire percorsi, marker e listener precedenti
   */
  const cleanupPreviousRoute = useCallback(() => {
    if (!map) return

    // Rimuovo layer del percorso
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
    }

    // Rimuovo marker
    if (startMarkerRef.current) {
      startMarkerRef.current.remove()
      startMarkerRef.current = null
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove()
      endMarkerRef.current = null
    }

    // Rimuovo listener
    if (updateMarkersListenerRef.current) {
      map.off('move zoom', updateMarkersListenerRef.current)
      updateMarkersListenerRef.current = null
    }
  }, [map, routeLayerRef, startMarkerRef, endMarkerRef, updateMarkersListenerRef])

  /**
   * Funzione helper per creare marker e listener
   */
  const createMarkersAndListeners = useCallback((startCoords, endCoords) => {
    if (!map) return

    // Creo marker di partenza e arrivo usando il factory
    startMarkerRef.current = createMapMarker(
      map,
      MarkerType.START,
      startCoords
    )

    endMarkerRef.current = createMapMarker(
      map,
      MarkerType.END,
      endCoords
    )

    // Creo listener per aggiornare posizioni marker
    updateMarkersListenerRef.current = createMarkersUpdateListener(
      map,
      [
        { marker: startMarkerRef.current, position: startCoords },
        { marker: endMarkerRef.current, position: endCoords }
      ]
    )
    map.on('move zoom', updateMarkersListenerRef.current)
  }, [map, startMarkerRef, endMarkerRef, updateMarkersListenerRef])

  /**
   * Carica e visualizza un percorso salvato
   * @param {Object} route - Dati del percorso salvato
   */
  const loadSavedRoute = useCallback((route) => {
    try {
      if (!map) {
        logger.error('Map not initialized')
        return
      }

      // Pulisco eventuali percorsi precedenti
      cleanupPreviousRoute()

      // Imposto i punti di partenza e arrivo
      setStartPoint(route.startPoint)
      setEndPoint(route.endPoint)
      setStartText(route.startPoint.name || '')
      setEndText(route.endPoint.name || '')

      // Imposto le info del percorso
      setRouteInfo({
        distance: route.distance,
        duration: route.duration,
        ascent: route.ascent,
        descent: route.descent
      })

      // Imposto le istruzioni
      setInstructions(Array.isArray(route.instructions) ? route.instructions : [])

      // Creo il GeoJSON dal percorso salvato
      const geojson = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: route.coordinates
        },
        properties: {}
      }

      // Disegno il percorso sulla mappa
      const newRouteLayer = L.geoJSON(geojson, {
        style: { color: '#2563eb', weight: 4, opacity: 0.8 }
      }).addTo(map)
      
      setRouteLayer(newRouteLayer)
      routeLayerRef.current = newRouteLayer

      // Creo marker e listener
      createMarkersAndListeners(
        { lat: route.startPoint.lat, lng: route.startPoint.lon },
        { lat: route.endPoint.lat, lng: route.endPoint.lon }
      )

      // Adatto la vista della mappa al percorso
      map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] })

      // Salvo i dati completi del percorso
      setFullRouteData(route)
      setIsPreloaded(true)
      setRouteSaved(true) // Percorso caricato da saved routes -> già salvato

      logger.log('Saved route loaded successfully')
    } catch (error) {
      logger.error('Error loading saved route:', error)
      setErrorMsg('Errore nel caricamento del percorso salvato')
    }
  }, [
    map,
    cleanupPreviousRoute,
    createMarkersAndListeners,
    setStartPoint,
    setEndPoint,
    setStartText,
    setEndText,
    setRouteInfo,
    setInstructions,
    setRouteLayer,
    setFullRouteData,
    setIsPreloaded,
    setRouteSaved,
    setErrorMsg,
    routeLayerRef
  ])

  /**
   * Carica e visualizza un percorso hiking da Overpass
   * @param {Object} hike - Dati del percorso hiking
   */
  const loadHikingRoute = useCallback((hike) => {
    try {
      if (!map) {
        logger.error('Map not initialized')
        return
      }

      logger.log('Loading hike with elevation data:', hike)

      // Pulisco eventuali percorsi precedenti
      cleanupPreviousRoute()

      // Reset degli stati
      setStartPoint(null)
      setEndPoint(null)
      setStartText('')
      setEndText('')
      setInstructions([])
      setIsPreloaded(true)

      // Creo il GeoJSON dal percorso hiking
      const geojson = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: hike.coordinates
        },
        properties: {
          name: hike.name
        }
      }

      // Disegno il percorso sulla mappa con colore verde
      const newRouteLayer = L.geoJSON(geojson, {
        style: { color: '#10b981', weight: 4, opacity: 0.8 }
      }).addTo(map)
      
      setRouteLayer(newRouteLayer)
      routeLayerRef.current = newRouteLayer

      // Calcola distanza se non fornita
      let totalDistance = hike.length || 0

      if (!totalDistance) {
        for (let i = 0; i < hike.coordinates.length - 1; i++) {
          const [lon1, lat1] = hike.coordinates[i]
          const [lon2, lat2] = hike.coordinates[i + 1]
          totalDistance += calculateDistance(lat1, lon1, lat2, lon2)
        }
      }

      // Imposto le info del percorso
      setRouteInfo({
        distance: parseFloat(totalDistance.toFixed(2)),
        duration: hike.duration || Math.round(totalDistance * 20),
        ascent: hike.ascent || 0,
        descent: hike.descent || 0
      })

      // Coordinate di inizio e fine
      const startCoord = hike.coordinates[0]
      const endCoord = hike.coordinates[hike.coordinates.length - 1]

      // Creo marker e listener
      createMarkersAndListeners(
        { lat: startCoord[1], lng: startCoord[0] },
        { lat: endCoord[1], lng: endCoord[0] }
      )

      // Adatto la vista della mappa al percorso
      map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] })

      // Salvo i dati completi del percorso per permettere il salvataggio
      const hikingFullData = {
        startPoint: { 
          lat: startCoord[1], 
          lon: startCoord[0], 
          name: hike.name || 'Partenza' 
        },
        endPoint: { 
          lat: endCoord[1], 
          lon: endCoord[0], 
          name: hike.name ? `${hike.name} - Arrivo` : 'Arrivo' 
        },
        distance: parseFloat(totalDistance.toFixed(2)),
        duration: hike.duration || Math.round(totalDistance * 20),
        ascent: hike.ascent || 0,
        descent: hike.descent || 0,
        coordinates: hike.coordinates,
        instructions: Array.isArray(hike.instructions) ? hike.instructions : []
      }

      setFullRouteData(hikingFullData)
      setRouteSaved(false) // Percorsi hiking non sono salvati di default

      logger.log('Hiking route loaded successfully')
    } catch (error) {
      logger.error('Error loading hiking route:', error)
      setErrorMsg('Errore nel caricamento del percorso di hiking')
    }
  }, [
    map,
    cleanupPreviousRoute,
    createMarkersAndListeners,
    setStartPoint,
    setEndPoint,
    setStartText,
    setEndText,
    setRouteInfo,
    setInstructions,
    setRouteLayer,
    setFullRouteData,
    setIsPreloaded,
    setRouteSaved,
    setErrorMsg,
    routeLayerRef
  ])

  return {
    loadSavedRoute,
    loadHikingRoute,
    cleanupPreviousRoute // Esporto anche la funzione di cleanup per uso in handleReset
  }
}