import { useState, useRef, useCallback } from 'react'
import { calculateDistance } from '../utils/gpsUtils'

/**
 * Custom hook per gestire il tracking GPS in tempo reale
 * 
 * Funzionalità:
 * - Aggiornamento posizione corrente
 * - Registrazione traccia punti GPS
 * - Calcolo distanza percorsa con formula Haversine
 * - Calcolo dislivello (salita/discesa) da altitudine GPS
 * - Calcolo direzione movimento (bearing) in gradi
 * - Gestione accuratezza GPS e waiting for fix
 * - Filtro punti troppo vicini (minPointDistanceMeters)
 * 
 * @param {Object} params - Parametri dell'hook
 * @param {boolean} params.isTracking - Se il tracking è attivo
 * @param {boolean} params.isPaused - Se il tracking è in pausa
 * @param {React.RefObject} params.isTrackingRef - Ref per isTracking (per callbacks)
 * @param {React.RefObject} params.isPausedRef - Ref per isPaused (per callbacks)
 * @param {Object} params.settings - Impostazioni utente (gpsAccuracyMax, minPointDistanceMeters)
 * @param {Object} params.toast - Sistema notifiche toast
 * 
 * @returns {Object} State e funzioni GPS
 */
const useGPSTracking = ({
  isTracking,
  isPaused,
  isTrackingRef,
  isPausedRef,
  settings,
  toast
}) => {
  // State GPS
  const [currentPosition, setCurrentPosition] = useState(null)
  const [trackPoints, setTrackPoints] = useState([])
  const [distance, setDistance] = useState(0)
  const [elevationGain, setElevationGain] = useState(0)
  const [elevationLoss, setElevationLoss] = useState(0)
  const [heading, setHeading] = useState(0)
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [waitingForGoodFix, setWaitingForGoodFix] = useState(false)

  // Ref per ultima elevazione registrata
  const lastElevation = useRef(null)

  /**
   * Gestisce l'aggiornamento della posizione GPS
   * Calcola distanza, elevazione e direzione
   */
  const handlePositionUpdate = useCallback((position) => {
    const newPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      altitude: position.coords.altitude,
      timestamp: position.timestamp,
      accuracy: position.coords.accuracy
    }

    // Aggiorna posizione corrente e accuratezza
    setCurrentPosition(newPoint)
    setGpsAccuracy(position.coords.accuracy)

    // Controlla se accuratezza è sufficiente
    if (position.coords.accuracy <= (settings?.gpsAccuracyMax || 150)) {
      setWaitingForGoodFix(false)
    }

    // Se non tracking o in pausa, non registra punti
    if (!isTrackingRef.current || isPausedRef.current) {
      return
    }

    // Aggiungi punto alla traccia con functional update
    setTrackPoints(prevTrackPoints => {
      // Calcola direzione del movimento (bearing)
      if (prevTrackPoints.length > 0 && !isPausedRef.current && isTrackingRef.current) {
        const lastPoint = prevTrackPoints[prevTrackPoints.length - 1]
        
        // Formula bearing: converte lat/lon in radianti
        const lat1 = lastPoint.lat * Math.PI / 180
        const lat2 = newPoint.lat * Math.PI / 180
        const dLon = (newPoint.lng - lastPoint.lng) * Math.PI / 180

        // Calcolo componenti X e Y per bearing
        const y = Math.sin(dLon) * Math.cos(lat2)
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
        const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360

        setHeading(bearing)
      }

      // Primo punto della traccia
      if (prevTrackPoints.length === 0) {
        if (newPoint.altitude !== null) {
          lastElevation.current = newPoint.altitude
        }
        return [newPoint]
      }

      // Calcola distanza dal punto precedente usando Haversine
      const lastPoint = prevTrackPoints[prevTrackPoints.length - 1]
      const dist = calculateDistance(
        lastPoint.lat, lastPoint.lng,
        newPoint.lat, newPoint.lng
      )

      // Distanza minima richiesta tra punti (default 3m -> 0.003km)
      const minDistance = (settings?.minPointDistanceMeters || 3) / 1000

      // Aggiungi punto solo se supera distanza minima
      if (dist >= minDistance) {
        // Incrementa distanza totale
        setDistance(prev => prev + dist)

        // Calcola dislivello se altitudine disponibile
        if (newPoint.altitude !== null && lastElevation.current !== null) {
          const elevDiff = newPoint.altitude - lastElevation.current

          if (elevDiff > 0) {
            // Salita
            setElevationGain(prev => prev + elevDiff)
          } else if (elevDiff < 0) {
            // Discesa
            setElevationLoss(prev => prev + Math.abs(elevDiff))
          }

          lastElevation.current = newPoint.altitude
        }

        return [...prevTrackPoints, newPoint]
      }

      // Punto troppo vicino, non aggiungerlo
      return prevTrackPoints
    })
  }, [settings?.gpsAccuracyMax, settings?.minPointDistanceMeters, isTrackingRef, isPausedRef])

  /**
   * Gestisce errori GPS
   */
  const handlePositionError = useCallback((error) => {
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
  }, [toast])

  return {
    currentPosition,
    trackPoints,
    distance,
    elevationGain,
    elevationLoss,
    heading,
    gpsAccuracy,
    waitingForGoodFix,
    handlePositionUpdate,
    handlePositionError
  }
}

export default useGPSTracking