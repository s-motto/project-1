import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

/**
 * Componente helper per gestire il long press sulla mappa Leaflet
 * 
 * Funzionamento:
 * - Rileva quando l'utente tiene premuto sulla mappa per più di 500ms
 * - Previene l'attivazione accidentale
 * - Chiama onLongPress con le coordinate lat/lng del punto premuto
 * 
 * @param {Function} onLongPress - Callback chiamato al long press con {lat, lng}
 * @param {Boolean} disabled - Se true, disabilita il long press
 */
const MapLongPressHandler = ({ onLongPress, disabled = false }) => {
  const map = useMap()

  useEffect(() => {
    if (!map || disabled) return

    let pressTimer = null // Timer per il long press
    let startPos = null // Posizione iniziale del touch/click
    let hasMoved = false // Flag per rilevare se l'utente ha trascinato

    // gestione TOUCH (Mobile)
    
    //inizio il timer al touchstart 
    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return // Solo singolo tocco
      
      hasMoved = false
      startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      
      // Avvia timer: dopo 500ms considera long press
      pressTimer = setTimeout(() => {
        if (!hasMoved) {
          const latLng = map.mouseEventToLatLng(e.touches[0])
          onLongPress(latLng)
        }
      }, 500)
    }

    //rilevo se l'utente si è mosso durante il touch
    const handleTouchMove = (e) => {
      if (!startPos) return
      
      const moveX = Math.abs(e.touches[0].clientX - startPos.x)
      const moveY = Math.abs(e.touches[0].clientY - startPos.y)
      
      // Se si muove più di 10px, è un drag, non long press
      if (moveX > 10 || moveY > 10) {
        hasMoved = true
        clearTimeout(pressTimer)
      }
    }

    // pulisco il timer al touchend
    const handleTouchEnd = () => {
      clearTimeout(pressTimer)
      startPos = null
    }

    // ==========================================
    // GESTIONE MOUSE (Desktop - per testing)
    // ==========================================
    
    const handleMouseDown = (e) => {
      hasMoved = false
      startPos = { x: e.clientX, y: e.clientY }
      
      pressTimer = setTimeout(() => {
        if (!hasMoved) {
          onLongPress(e.latlng)
        }
      }, 500)
    }

    const handleMouseMove = (e) => {
      if (!startPos) return
      
      const moveX = Math.abs(e.clientX - startPos.x)
      const moveY = Math.abs(e.clientY - startPos.y)
      
      if (moveX > 10 || moveY > 10) {
        hasMoved = true
        clearTimeout(pressTimer)
      }
    }

    const handleMouseUp = () => {
      clearTimeout(pressTimer)
      startPos = null
    }

    // registro gli eventi sulla mappa
    const container = map.getContainer()
    
    // Touch events (mobile)
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    // Mouse events (desktop)
    map.on('mousedown', handleMouseDown)
    map.on('mousemove', handleMouseMove)
    map.on('mouseup', handleMouseUp)

    // cleanup alla dismount del componente
    return () => {
      clearTimeout(pressTimer)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      map.off('mousedown', handleMouseDown)
      map.off('mousemove', handleMouseMove)
      map.off('mouseup', handleMouseUp)
    }
  }, [map, onLongPress, disabled])

  return null // Componente invisibile
}

export default MapLongPressHandler