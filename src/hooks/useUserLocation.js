import { useState, useCallback } from 'react'
import { reverseGeocode } from '../services/geocodingService'
import logger from '../utils/logger'

/**
 * Custom hook per gestire la geolocalizzazione dell'utente
 * Gestisce: richiesta posizione GPS, reverse geocoding, centratura mappa, gestione errori
 * 
 * @param {Object} map - Istanza della mappa Leaflet
 * @param {string} apiKey - Chiave API OpenRouteService per reverse geocoding
 * @returns {Object} Oggetto con funzione getCurrentLocation e stati
 */
export const useUserLocation = (map, apiKey) => {
  const [gettingLocation, setGettingLocation] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  /**
   * Ottiene la posizione corrente dell'utente usando l'API di geolocalizzazione
   * Esegue reverse geocoding per ottenere l'indirizzo
   * Centra la mappa sulla posizione trovata
   * 
   * @param {Function} onSuccess - Callback chiamata con i dati della posizione
   *   Riceve: { lat, lon, name, displayText }
   * @param {Function} onError - Callback chiamata in caso di errore
   */
  const getCurrentLocation = useCallback((onSuccess, onError) => {
    setGettingLocation(true)
    setErrorMsg('')

    // Verifica supporto geolocalizzazione
    if (!navigator.geolocation) {
      const error = 'Il tuo browser non supporta la geolocalizzazione'
      setErrorMsg(error)
      setGettingLocation(false)
      if (onError) onError(error)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude

        // Centro la mappa sulla posizione dell'utente
        if (map) {
          map.setView([lat, lon], 13)
        }

        // Salvo la posizione base
        setUserLocation({ lat, lon })

        // Reverse geocoding per ottenere il nome del luogo
        try {
          const placeName = await reverseGeocode(lat, lon, apiKey)

          const locationData = {
            lat,
            lon,
            name: placeName || 'La tua posizione',
            displayText: placeName ? `📍 ${placeName}` : '📍 La tua posizione'
          }

          setGettingLocation(false)

          // Callback con i dati completi
          if (onSuccess) {
            onSuccess(locationData)
          }
        } catch (error) {
          logger.error('Reverse geocoding error:', error)

          // Anche in caso di errore di geocoding, ritorno la posizione
          const locationData = {
            lat,
            lon,
            name: 'La tua posizione',
            displayText: '📍 La tua posizione'
          }

          setGettingLocation(false)

          if (onSuccess) {
            onSuccess(locationData)
          }
        }
      },
      (error) => {
        logger.error('Geolocation error:', error)

        let errorMessage = 'Errore nel recupero della posizione'

        // Messaggi di errore specifici in base al codice
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permesso di geolocalizzazione negato'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Posizione non disponibile'
            break
          case error.TIMEOUT:
            errorMessage = 'Richiesta posizione scaduta'
            break
          default:
            errorMessage = 'Errore nel recupero della posizione'
        }

        setErrorMsg(errorMessage)
        setGettingLocation(false)

        if (onError) {
          onError(errorMessage)
        }
      },
      {
        enableHighAccuracy: true, // Usa GPS ad alta precisione
        timeout: 10000, // Timeout di 10 secondi
        maximumAge: 0 // Non usa posizioni in cache
      }
    )
  }, [map, apiKey])

  return {
    getCurrentLocation,
    gettingLocation,
    userLocation,
    locationError: errorMsg
  }
}