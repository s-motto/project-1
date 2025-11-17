import { useCallback } from 'react'

/**
 * Custom hook per gestire gli handler del MapPointSelector
 * Fornisce funzioni per: impostare punto partenza/arrivo, invertire punti, chiudere modal
 * 
 * @param {Object} dependencies - Oggetto con tutte le dipendenze necessarie
 * @returns {Object} Oggetto con le 4 funzioni handler
 */
export const useMapPointHandlers = ({
  selectedMapPoint,
  startPoint,
  endPoint,
  startText,
  endText,
  setStartPoint,
  setEndPoint,
  setStartText,
  setEndText,
  setShowMapPointSelector,
  toast,
  removeTempMarkerRef
}) => {
  /**
   * Helper per rimuovere il marker temporaneo
   */
  const cleanupTempMarker = useCallback(() => {
    if (removeTempMarkerRef.current) {
      removeTempMarkerRef.current()
      removeTempMarkerRef.current = null
    }
  }, [removeTempMarkerRef])

  /**
   * Imposta il punto selezionato come punto di partenza
   */
  const handleSetAsStart = useCallback(() => {
    if (selectedMapPoint) {
      setStartPoint({
        lat: selectedMapPoint.lat,
        lon: selectedMapPoint.lng,
        name: selectedMapPoint.name
      })
      setStartText(selectedMapPoint.name)
      toast.success('📍 Punto di partenza impostato!')
    }
    setShowMapPointSelector(false)
    cleanupTempMarker()
  }, [
    selectedMapPoint,
    setStartPoint,
    setStartText,
    setShowMapPointSelector,
    toast,
    cleanupTempMarker
  ])

  /**
   * Imposta il punto selezionato come punto di arrivo
   */
  const handleSetAsEnd = useCallback(() => {
    if (selectedMapPoint) {
      setEndPoint({
        lat: selectedMapPoint.lat,
        lon: selectedMapPoint.lng,
        name: selectedMapPoint.name
      })
      setEndText(selectedMapPoint.name)
      toast.success('🏁 Punto di arrivo impostato!')
    }
    setShowMapPointSelector(false)
    cleanupTempMarker()
  }, [
    selectedMapPoint,
    setEndPoint,
    setEndText,
    setShowMapPointSelector,
    toast,
    cleanupTempMarker
  ])

  /**
   * Inverte i punti di partenza e arrivo
   */
  const handleSwapPoints = useCallback(() => {
    if (startPoint && endPoint) {
      // Swap dei punti
      const temp = { ...startPoint }
      setStartPoint(endPoint)
      setEndPoint(temp)

      // Swap dei testi
      const tempText = startText
      setStartText(endText)
      setEndText(tempText)

      toast.success('🔄 Punti invertiti!')
    }
    setShowMapPointSelector(false)
    cleanupTempMarker()
  }, [
    startPoint,
    endPoint,
    startText,
    endText,
    setStartPoint,
    setEndPoint,
    setStartText,
    setEndText,
    setShowMapPointSelector,
    toast,
    cleanupTempMarker
  ])

  /**
   * Chiude il selettore senza fare modifiche
   */
  const handleCloseSelector = useCallback(() => {
    setShowMapPointSelector(false)
    cleanupTempMarker()
  }, [setShowMapPointSelector, cleanupTempMarker])

  return {
    handleSetAsStart,
    handleSetAsEnd,
    handleSwapPoints,
    handleCloseSelector
  }
}