import { useRef, useCallback, useMemo } from 'react'
import { Geolocation } from '@capacitor/geolocation'

export default function useGeolocation() {
  const watchIdRef = useRef(null)

  // Hook per gestire la geolocalizzazione dell'utente
  const start = useCallback(async (onPosition, onError, options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }) => {
    try {
      // Richiedi permessi GPS (necessario per Capacitor su Android)
      const permission = await Geolocation.requestPermissions()
      
      if (permission.location !== 'granted') {
        onError && onError({ code: 1, message: 'Permesso GPS negato' })
        return
      }

      if (watchIdRef.current) return watchIdRef.current

      // Avvia il watching con plugin Capacitor
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
        (pos, err) => {
          if (err) {
            onError && onError(err)
            return
          }
          if (pos) {
            onPosition && onPosition(pos)
          }
        }
      )

      watchIdRef.current = id
      return id

    } catch (error) {
      onError && onError({ code: 2, message: error.message })
    }
  }, [])

  // Funzione per fermare l'ascolto della geolocalizzazione
  const stop = useCallback(async () => {
    if (watchIdRef.current) {
      await Geolocation.clearWatch({ id: watchIdRef.current })
      watchIdRef.current = null
    }
  }, [])

  // API esposta dall'hook
  const api = useMemo(() => ({
    start,
    stop,
    isWatching: () => !!watchIdRef.current
  }), [start, stop])

  return api
}