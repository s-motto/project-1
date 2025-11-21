import logger from '../utils/logger'
import { callORS } from './appwriteProxy'

/**
 * Service per il calcolo dei percorsi utilizzando OpenRouteService API
 * tramite Appwrite Function proxy
 */

/**
 * Calcola un percorso a piedi tra due punti
 * @param {Object} params - Parametri per il calcolo del percorso
 * @param {Object} params.start - Punto di partenza {lat, lon, name}
 * @param {Object} params.end - Punto di arrivo {lat, lon, name}
 * @param {string} params.language - Lingua per le istruzioni (default: 'it')
 * @param {string} params.units - Unità di misura (default: 'km')
 * @returns {Promise<Object>} Dati del percorso calcolato
 */
export const calculateRoute = async ({ start, end, language = 'it', units = 'km' }) => {
  try {
    const data = await callORS('v2/directions/foot-hiking/geojson', {
      coordinates: [[start.lon, start.lat], [end.lon, end.lat]],
      instructions: true,
      language: language,
      units: units,
      elevation: true
    })

    if (!data.features || data.features.length === 0) {
      throw new Error('No route found')
    }

    const feature = data.features[0]
    const props = feature.properties
    const summary = props.summary || {}

    // Estraggo le coordinate del percorso
    const coordinates = feature.geometry.coordinates

    // Estraggo le istruzioni step-by-step
    const instructions = props.segments?.[0]?.steps || []

    // Preparo i dati del percorso in formato standardizzato
    return {
      success: true,
      data: {
        // Punti di partenza e arrivo
        startPoint: start,
        endPoint: end,
        
        // Statistiche del percorso
        distance: parseFloat(summary.distance.toFixed(2)), // km
        duration: Math.round(summary.duration / 60), // minuti
        ascent: props.ascent ? Math.round(props.ascent) : 0, // metri
        descent: props.descent ? Math.round(props.descent) : 0, // metri
        
        // Dati geometrici
        coordinates: coordinates, // Array di [lon, lat]
        
        // Istruzioni passo-passo
        instructions: instructions,
        
        // GeoJSON completo per il rendering
        geojson: feature
      }
    }
  } catch (error) {
    logger.error('Route calculation error:', error)
    return {
      success: false,
      error: error.message || 'Errore nel calcolo del percorso'
    }
  }
}

/**
 * Calcola un percorso con waypoint intermedi
 * @param {Object} params - Parametri per il calcolo del percorso
 * @param {Array<Object>} params.points - Array di punti [{lat, lon, name}]
 * @param {string} params.language - Lingua per le istruzioni (default: 'it')
 * @param {string} params.units - Unità di misura (default: 'km')
 * @returns {Promise<Object>} Dati del percorso calcolato
 */
export const calculateRouteWithWaypoints = async ({ points, language = 'it', units = 'km' }) => {
  if (!points || points.length < 2) {
    return {
      success: false,
      error: 'Servono almeno 2 punti per calcolare un percorso'
    }
  }

  try {
    const coordinates = points.map(p => [p.lon, p.lat])
    
    const data = await callORS('v2/directions/foot-hiking/geojson', {
      coordinates: coordinates,
      instructions: true,
      language: language,
      units: units,
      elevation: true
    })

    if (!data.features || data.features.length === 0) {
      throw new Error('No route found')
    }

    const feature = data.features[0]
    const props = feature.properties
    const summary = props.summary || {}

    return {
      success: true,
      data: {
        startPoint: points[0],
        endPoint: points[points.length - 1],
        waypoints: points.slice(1, -1), // Punti intermedi
        
        distance: parseFloat(summary.distance.toFixed(2)),
        duration: Math.round(summary.duration / 60),
        ascent: props.ascent ? Math.round(props.ascent) : 0,
        descent: props.descent ? Math.round(props.descent) : 0,
        
        coordinates: feature.geometry.coordinates,
        instructions: props.segments?.[0]?.steps || [],
        geojson: feature
      }
    }
  } catch (error) {
    logger.error('Route with waypoints calculation error:', error)
    return {
      success: false,
      error: error.message || 'Errore nel calcolo del percorso con waypoint'
    }
  }
}

export default {
  calculateRoute,
  calculateRouteWithWaypoints
}