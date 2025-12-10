import logger from '../utils/logger'
import { callORS } from './appwriteProxy'

/**
 * Service per la gestione del geocoding e dell'autocomplete
 * Utilizza OpenRouteService API tramite Appwrite Function proxy
 */

/**
 * Geocodifica un testo in coordinate geografiche
 * @param {string} text - Testo da geocodificare (es. "Milano, Italia")
 * @returns {Promise<{lat: number, lon: number, name: string}|null>} Coordinate e nome del luogo
 */
export const geocodeText = async (text) => {
  if (!text) return null
  
  try {
    const data = await callORS('geocode/search', {
      text: text,
      'boundary.country': 'IT',
      size: '1'
    })
    
    if (data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates
      return { 
        lat: coords[1], 
        lon: coords[0], 
        name: data.features[0].properties.label 
      }
    }
    
    return null
  } catch (error) {
    logger.error('Geocoding error:', error)
    return null
  }
}

/**
 * Ottiene suggerimenti di autocomplete per un testo
 * @param {string} text - Testo parziale da completare
 * @param {number} maxResults - Numero massimo di risultati (default: 5)
 * @returns {Promise<Array<{lat: number, lon: number, display_name: string, place_id: string}>>} Lista di suggerimenti
 */
export const fetchSuggestions = async (text, maxResults = 5) => {
  if (!text || text.length < 2) return []
  
  try {
    const data = await callORS('geocode/search', {
      text: text,
      'boundary.country': 'IT',
      size: maxResults.toString()
    })
    
    return data.features.map(feature => ({
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      display_name: feature.properties.label,
      place_id: feature.properties.id
    }))
  } catch (error) {
    logger.error('Suggestions error:', error)
    return []
  }
}

/**
 * Reverse geocoding: ottiene il nome di un luogo dalle coordinate
 * @param {number} lat - Latitudine
 * @param {number} lon - Longitudine
 * @returns {Promise<string|null>} Nome del luogo o null
 */
export const reverseGeocode = async (lat, lon) => {
  try {
    const data = await callORS('geocode/reverse', {
      'point.lat': lat.toString(),
      'point.lon': lon.toString(),
      size: '1'
    })
    
    if (data.features && data.features.length > 0) {
      return data.features[0].properties.label || data.features[0].properties.name || 'Località sconosciuta'
    }
    
    return null
  } catch (error) {
    logger.error('Reverse geocoding error:', error)
    return null
  }
}

export default {
  geocodeText,
  fetchSuggestions,
  reverseGeocode
}