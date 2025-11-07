import { useRef, useCallback, useMemo } from 'react'

export default function useGeolocation() {
  const watchIdRef = useRef(null)
  // Hook per gestire la geolocalizzazione dell'utente
  const start = useCallback((onPosition, onError, options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }) => {
    if (!('geolocation' in navigator)) { // geolocalizzazione non supportata
      onError && onError(new Error('Geolocation not supported'))
      return
    }
    if (watchIdRef.current) return watchIdRef.current // già in ascolto
    const id = navigator.geolocation.watchPosition(
      (pos) => onPosition && onPosition(pos),
      (err) => onError && onError(err),
      options
    )
    watchIdRef.current = id
    return id
  }, [])
  // Funzione per fermare l'ascolto della geolocalizzazione
  const stop = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
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
