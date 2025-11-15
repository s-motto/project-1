import logger from '../utils/logger'

/**
 * Service per la gestione del geocoding e dell'autocomplete
 * Utilizza OpenRouteService API
 */

/**
 * Geocodifica un testo in coordinate geografiche
 * @param {string} text - Testo da geocodificare (es. "Milano, Italia")
 * @param {string} apiKey - Chiave API OpenRouteService
 * @returns {Promise<{lat: number, lon: number, name: string}|null>} Coordinate e nome del luogo
 */
export const geocodeText = async (text, apiKey) => {
  if (!text) return null
  
  try {
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(text)}&boundary.country=IT&size=1`
    const response = await fetch(url)
    
    if (!response.ok) {
      logger.error('Geocoding API error:', response.status)
      return null
    }
    
    const data = await response.json()
    
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
 * @param {string} apiKey - Chiave API OpenRouteService
 * @param {number} maxResults - Numero massimo di risultati (default: 5)
 * @returns {Promise<Array<{lat: number, lon: number, display_name: string, place_id: string}>>} Lista di suggerimenti
 */
export const fetchSuggestions = async (text, apiKey, maxResults = 5) => {
  if (!text || text.length < 2) return []
  
  try {
    const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${apiKey}&text=${encodeURIComponent(text)}&boundary.country=IT&size=${maxResults}`
    const response = await fetch(url)
    
    if (!response.ok) {
      logger.error('Autocomplete API error:', response.status)
      return []
    }
    
    const data = await response.json()
    
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
 * @param {string} apiKey - Chiave API OpenRouteService
 * @returns {Promise<string|null>} Nome del luogo o null
 */
export const reverseGeocode = async (lat, lon, apiKey) => {
  try {
    const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${apiKey}&point.lat=${lat}&point.lon=${lon}&size=1`
    const response = await fetch(url)
    
    if (!response.ok) {
      logger.error('Reverse geocoding API error:', response.status)
      return null
    }
    
    const data = await response.json()
    
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