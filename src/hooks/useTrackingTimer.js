import { useState, useEffect, useRef } from 'react'

/**
 * Custom hook per gestire il timer del tracking GPS
 * Gestisce automaticamente: avvio, pausa/riprendi, reset, cleanup
 * 
 * @param {boolean} isTracking - Se il tracking è attivo
 * @param {boolean} isPaused - Se il tracking è in pausa
 * @returns {Object} { elapsedTime } - Tempo trascorso in secondi
 * 
 * @example
 * const { elapsedTime } = useTrackingTimer(isTracking, isPaused)
 * // elapsedTime viene aggiornato ogni secondo quando tracking è attivo
 * // Si resetta automaticamente quando isTracking passa da false a true
 */
export function useTrackingTimer(isTracking, isPaused) {
  // Stato: tempo trascorso in secondi
  const [elapsedTime, setElapsedTime] = useState(0)

  // Refs interni per gestione timer
  const startTimeRef = useRef(0)          // Timestamp inizio tracking
  const pausedTimeRef = useRef(0)         // Tempo totale in pausa (ms)
  const timerRef = useRef(null)           // Riferimento setInterval
  const previousTrackingRef = useRef(false) // Tracking precedente per detectare start

  // Effect 1: Auto-reset quando tracking viene avviato
  useEffect(() => {
    // Detecta quando isTracking passa da false a true
    if (isTracking && !previousTrackingRef.current) {
      // Reset completo del timer
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      setElapsedTime(0)
    }

    // Aggiorna il valore precedente
    previousTrackingRef.current = isTracking
  }, [isTracking])

  // Effect 2: Gestione timer (start/stop/pause)
  useEffect(() => {
    // Se tracking attivo e NON in pausa → avvia timer
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTimeRef.current - pausedTimeRef.current) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
    } else {
      // Altrimenti ferma il timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      // Se messo in pausa, accumula il tempo di pausa
      if (isTracking && isPaused && elapsedTime > 0) {
        const now = Date.now()
        pausedTimeRef.current = now - startTimeRef.current - elapsedTime * 1000
      }
    }

    // Cleanup: ferma timer quando unmount o cambio dipendenze
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isTracking, isPaused, elapsedTime])

  // Espone solo il tempo trascorso
  return { elapsedTime }
}

export default useTrackingTimer