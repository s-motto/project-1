import { useState, useCallback } from 'react'
import { Geolocation } from '@capacitor/geolocation'
import { reverseGeocode } from '../services/geocodingService'
import logger from '../utils/logger'

/**
 * Custom hook per gestire la geolocalizzazione dell'utente
 * Gestisce: richiesta posizione GPS, reverse geocoding, centratura mappa, gestione errori
 * 
 * @param {Object} map - Istanza della mappa Leaflet
 * @returns {Object} Oggetto con funzione getCurrentLocation e stati
 */
export const useUserLocation = (map) => {
  const [gettingLocation, setGettingLocation] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  /**
   * Ottiene la posizione corrente dell'utente usando Capacitor Geolocation
   * Esegue reverse geocoding per ottenere l'indirizzo
   * Centra la mappa sulla posizione trovata
   * 
   * @param {Function} onSuccess - Callback chiamata con i dati della posizione
   * @param {Function} onError - Callback chiamata in caso di errore
   */
  const getCurrentLocation = useCallback(async (onSuccess, onError) => {
    setGettingLocation(true)
    setErrorMsg('')

    try {
      // Richiedi permessi GPS tramite Capacitor
      const permission = await Geolocation.requestPermissions()

      if (permission.location !== 'granted') {
        const error = 'Permesso di geolocalizzazione negato'
        setErrorMsg(error)
        setGettingLocation(false)
        if (onError) onError(error)
        return
      }

      // Ottieni posizione corrente tramite Capacitor
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      })

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
        const placeName = await reverseGeocode(lat, lon)

        const locationData = {
          lat,
          lon,
          name: placeName || 'La tua posizione',
          displayText: placeName ? `📍 ${placeName}` : '📍 La tua posizione'
        }

        setGettingLocation(false)
        if (onSuccess) onSuccess(locationData)

      } catch (error) {
        logger.error('Reverse geocoding error:', error)

        const locationData = {
          lat,
          lon,
          name: 'La tua posizione',
          displayText: '📍 La tua posizione'
        }

        setGettingLocation(false)
        if (onSuccess) onSuccess(locationData)
      }

    } catch (error) {
      logger.error('Geolocation error:', error)

      let errorMessage = 'Errore nel recupero della posizione'

      if (error.message?.includes('denied') || error.code === 1) {
        errorMessage = 'Permesso di geolocalizzazione negato'
      } else if (error.code === 2) {
        errorMessage = 'Posizione non disponibile'
      } else if (error.code === 3) {
        errorMessage = 'Richiesta posizione scaduta'
      }

      setErrorMsg(errorMessage)
      setGettingLocation(false)
      if (onError) onError(errorMessage)
    }
  }, [map])

  return {
    getCurrentLocation,
    gettingLocation,
    userLocation,
    locationError: errorMsg
  }
}