import { useEffect, useRef } from 'react'
import { reverseGeocode } from '../services/geocodingService'
import logger from '../utils/logger'

/**
 * Custom hook per gestire i click sulla mappa e la selezione di punti
 * Gestisce: marker temporaneo, reverse geocoding, modal di selezione
 * 
 * @param {Object} map - Istanza della mappa Leaflet
 * @param {string} apiKey - Chiave API OpenRouteService
 * @param {Object} toast - Sistema di notifiche toast
 * @param {Function} onPointSelected - Callback quando un punto viene selezionato
 * @returns {Object} Oggetto vuoto (logica interna gestita da useEffect)
 */
export const useMapClick = (map, apiKey, toast, onPointSelected) => {
  const tempMarkerRef = useRef(null)

  useEffect(() => {
    if (!map) return

    const handleMapClick = async (e) => {
      const { lat, lng } = e.latlng

      // Rimuovo marker temporaneo precedente se esiste
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove()
        tempMarkerRef.current = null
      }

      // Creo marcatore temporaneo
      const tempMarkerDiv = document.createElement('div')
      tempMarkerDiv.className = 'temp-map-marker fade-in-marker'
      tempMarkerDiv.style.position = 'absolute'
      tempMarkerDiv.style.zIndex = '1000'
      tempMarkerDiv.style.pointerEvents = 'none'
      tempMarkerDiv.innerHTML = ' '

      // Posiziono il marcatore
      const pixel = map.latLngToContainerPoint([lat, lng])
      tempMarkerDiv.style.left = `${pixel.x}px`
      tempMarkerDiv.style.top = `${pixel.y}px`
      tempMarkerDiv.style.transform = 'translate(-50%, -100%)'

      document.getElementById('map').appendChild(tempMarkerDiv)
      tempMarkerRef.current = tempMarkerDiv

      // Aggiorna posizione marcatore con movimenti mappa
      const updateTempMarker = () => {
        if (tempMarkerRef.current) {
          const newPixel = map.latLngToContainerPoint([lat, lng])
          tempMarkerRef.current.style.left = `${newPixel.x}px`
          tempMarkerRef.current.style.top = `${newPixel.y}px`
        }
      }

      // Listener per aggiornare posizione durante zoom/pan
      map.on('move zoom', updateTempMarker)

      // Mostra loading toast
      toast.info('Ricerca indirizzo...')

      try {
        // Reverse geocoding usando il service
        const placeName = await reverseGeocode(lat, lng, apiKey)

        if (placeName) {
          // Callback con i dati del punto selezionato
          onPointSelected({
            lat,
            lng,
            name: placeName,
            // Fornisco anche la funzione per rimuovere il marker
            removeTempMarker: () => {
              if (tempMarkerRef.current) {
                tempMarkerRef.current.remove()
                tempMarkerRef.current = null
              }
              map.off('move zoom', updateTempMarker)
            }
          })
        } else {
          toast.error('Impossibile trovare l\'indirizzo')
          if (tempMarkerRef.current) {
            tempMarkerRef.current.remove()
            tempMarkerRef.current = null
          }
          map.off('move zoom', updateTempMarker)
        }
      } catch (error) {
        logger.error('Reverse geocoding error:', error)
        toast.error('Errore nel recupero dell\'indirizzo')
        if (tempMarkerRef.current) {
          tempMarkerRef.current.remove()
          tempMarkerRef.current = null
        }
        map.off('move zoom', updateTempMarker)
      }
    }

    // Registro il listener per click sulla mappa
    map.on('click', handleMapClick)

    // Cleanup quando l'hook viene smontato
    return () => {
      map.off('click', handleMapClick)
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove()
        tempMarkerRef.current = null
      }
    }
  }, [map, apiKey, toast, onPointSelected])

  // Non ritorno nulla perché tutta la logica è gestita internamente
  return {}
}