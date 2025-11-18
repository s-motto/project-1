// ==========================================
// ACTIVE TRACKING COMPONENT
// ==========================================
// Componente per il tracking GPS in tempo reale con supporto waypoints
// 
// Funzionalità principali:
// - Tracking GPS continuo con traccia verde
// - Percorso pianificato visualizzato in blu tratteggiato
// - Aggiunta waypoints tramite long press sulla mappa (max 5)
// - Ricalcolo automatico del percorso con waypoints
// - Statistiche in tempo reale (distanza, tempo, velocità, elevazione)
// - Pausa/riprendi tracking
// - Salvataggio automatico su Appwrite
// 
// Dark mode: Supportato tramite CSS variables (--bg-card, --text-primary, ecc.)
// Mobile-first: Layout ottimizzato per schermi piccoli
// ==========================================

import React, { useState, useEffect, useRef } from 'react'
import {
  FaTimes,
  FaMapMarkerAlt
} from 'react-icons/fa'

// Services e utilities
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useSettings } from '../contexts/SettingsContext'
import useGeolocation from '../hooks/useGeolocation'
import useTrackingTimer from '../hooks/useTrackingTimer'
import useTrackingSave from '../hooks/useTrackingSave'
import useWaypointManager from '../hooks/useWaypointManager'
import useGPSTracking from '../hooks/useGPSTracking'
import logger from '../utils/logger'
import { calculateSpeed } from '../utils/gpsUtils'

// Componenti tracking
import { TrackingStats, TrackingControls, WaypointDialog, TrackingMap } from './ActiveTracking/index.js'

// ==========================================
// COMPONENTE PRINCIPALE
// ==========================================
const ActiveTracking = ({ route, onClose, onComplete }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const { settings } = useSettings()
  const geolocation = useGeolocation()

  // State locali componente
  const [isTracking, setIsTracking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [shouldCenterMap, setShouldCenterMap] = useState(true)

  // Refs
  const isTrackingRef = useRef(false)
  const isPausedRef = useRef(false)
  const mapRef = useRef(null)

  // Hook timer tracking
  const { elapsedTime } = useTrackingTimer(isTracking, isPaused)

  // Hook GPS tracking - gestisce posizione, traccia, distanza, elevazione, heading
  const {
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
  } = useGPSTracking({
    isTracking,
    isPaused,
    isTrackingRef,
    isPausedRef,
    settings,
    toast
  })

  // Hook salvataggio tracking
  const { isSaving, savedRouteId, ensureRouteSaved, saveCompletedTracking } = useTrackingSave({
    route,
    user,
    trackingData: {
      distance,
      elapsedTime,
      elevationGain,
      elevationLoss,
      trackPoints
    },
    toast,
    onComplete
  })

  // Hook gestione waypoints
  const {
    waypoints,
    tempWaypoint,
    showWaypointDialog,
    waypointPreview,
    loadingPreview,
    recalculatingRoute,
    currentRouteData,
    showWaypointsList,
    setShowWaypointsList,
    handleMapLongPress,
    handleConfirmWaypoint,
    handleCancelWaypoint,
    handleRemoveWaypoint,
    formatPreviewDistance,
    formatPreviewDuration
  } = useWaypointManager({
    route,
    currentPosition,
    isTracking,
    toast,
    settings
  })

  // ==========================================
  // TRACKING CONTROL HANDLERS
  // ==========================================

  /**
   * Avvia tracking
   */
  const handleStart = async () => {
    if (!isTracking) {
      
      if (!savedRouteId) {
        try {
          await ensureRouteSaved()
          toast.info('Percorso salvato automaticamente per il tracking')
        } catch (error) {
          toast.error('Errore nel salvare il percorso: ' + error.message)
          return
        }
      }

      setIsTracking(true)
      setIsPaused(false)
      isTrackingRef.current = true
      isPausedRef.current = false
      setShouldCenterMap(true)

      // Verifica permessi GPS
      if (!navigator.geolocation) {
        logger.error('Geolocation non supportato')
        toast.error('GPS non disponibile su questo dispositivo')
        return
      }

      // Avvia GPS
      geolocation.start(
        handlePositionUpdate,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0
        }
      )
    }
  }

  /**
   * Pausa tracking
   */
  const handlePause = () => {
    if (!isPaused) {
      setIsPaused(true)
      isPausedRef.current = true
    }
  }

  /**
   * Riprendi tracking
   */
  const handleResume = () => {
    if (isPaused) {
      setIsPaused(false)
      isPausedRef.current = false
    }
  }

  /**
   * Termina e salva tracking
   */
  const handleStop = async () => {
    if (!confirm('Vuoi terminare il percorso e salvare i dati?')) return

    // Ferma GPS
    geolocation.stop()
    setIsTracking(false)
    isTrackingRef.current = false

    // Salva tracking
    const success = await saveCompletedTracking()

    // Chiudi modal dopo salvataggio
    if (success) {
      setTimeout(() => {
        onClose()
      }, 1000)
    }
  }

  /**
   * Annulla tracking senza salvare
   */
  const handleCancel = () => {
    if (!confirm('Vuoi annullare il tracking? I dati non verranno salvati.')) return

    geolocation.stop()
    setIsTracking(false)
    isTrackingRef.current = false
    onClose()
  }

  // ==========================================
  // EFFECTS
  // ==========================================

  // Blocca scroll body quando modal è aperto
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  // Cleanup: ferma GPS quando unmount
  useEffect(() => {
    return () => {
      geolocation.stop()
    }
  }, [geolocation])

  // ==========================================
  // CALCOLI STATISTICHE
  // ==========================================
  const avgSpeed = calculateSpeed(distance, elapsedTime)

  // Centro iniziale mappa
  const getInitialCenter = () => {
    if (currentPosition) {
      return [currentPosition.lat, currentPosition.lng]
    }

    if (route.startPoint) {
      return [route.startPoint.lat, route.startPoint.lon]
    }

    return [44.102, 9.824] // La Spezia default
  }

  const initialCenter = getInitialCenter()

  // Callback mappa pronta
  const handleMapReady = (map) => {
    mapRef.current = map
    setTimeout(() => {
      if (map) {
        map.invalidateSize()
      }
    }, 300)
  }

  // Callback ricentra mappa
  const handleCenterMap = () => {
    setShouldCenterMap(true)
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="modal-overlay">
      <div className="modal-content w-full-max-4xl h-[100vh] flex flex-col">

        {/* ========== HEADER ========== */}
        <div className="modal-header-primary">
          <div className="flex-between">
            <div className="space-x-3-items">
              <FaMapMarkerAlt className="text-2xl" />
              <div>
                <h2 className="text-xl font-bold">
                  {currentRouteData.name || 'Tracking GPS'}
                </h2>
                <p className="text-xs text-white/90">
                  {isTracking ? (isPaused ? 'In pausa' : 'Tracking attivo') : 'Pronto per iniziare'}
                </p>
              </div>
              {waypoints.length > 0 && (
                <div className="ml-4 relative">
                  <div className="bg-white/20 rounded px-2 py-1">
                    <button
                      onClick={() => setShowWaypointsList(!showWaypointsList)}
                      className="flex items-center text-xs text-white whitespace-nowrap"
                    >
                      <span className="mr-1">{waypoints.length} waypoint{waypoints.length > 1 ? 's' : ''}</span>
                      <span style={{ transform: showWaypointsList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                    </button>
                  </div>
                  {showWaypointsList && (
                    <div 
                      className="absolute top-full right-0 mt-1 rounded shadow-lg"
                      style={{ 
                        minWidth: '200px',
                        maxWidth: '280px',
                        backgroundColor: 'var(--dropdown-bg)',
                        border: '2px solid var(--dropdown-border)',
                        zIndex: 2100
                      }}
                    >
                      <div className="p-2 space-y-1 text-xs" style={{ color: 'var(--text-primary)' }}>
                        {waypoints.map((wp, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between rounded px-2 py-1.5 transition-colors"
                            style={{ 
                              backgroundColor: 'var(--dropdown-hover)',
                              cursor: 'default'
                            }}
                          >
                            <span className="truncate flex-1">{idx + 1}. {wp.name}</span>
                            <button
                              onClick={() => handleRemoveWaypoint(idx)}
                              className="ml-2 flex-shrink-0 hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--color-orange)' }}
                              aria-label={`Rimuovi waypoint ${wp.name}`}
                            >
                              <FaTimes className="text-xs" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleCancel}
              className="icon-btn-white"
              aria-label="Chiudi"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* ========== MAPPA ========== */}
        <TrackingMap
          initialCenter={initialCenter}
          currentRouteData={currentRouteData}
          trackPoints={trackPoints}
          waypoints={waypoints}
          tempWaypoint={tempWaypoint}
          currentPosition={currentPosition}
          heading={heading}
          shouldCenterMap={shouldCenterMap}
          recalculatingRoute={recalculatingRoute}
          isTracking={isTracking}
          isSaving={isSaving}
          onMapLongPress={handleMapLongPress}
          onMapReady={handleMapReady}
          onCenterMap={handleCenterMap}
        />

        {/* ========== STATISTICHE ========== */}
        <TrackingStats
          distance={distance}
          elapsedTime={elapsedTime}
          elevationGain={elevationGain}
          elevationLoss={elevationLoss}
          avgSpeed={avgSpeed}
          settings={settings}
          waypoints={waypoints}
          currentRouteData={currentRouteData}
        />

        {/* ========== CONTROLLI ========== */}
        <TrackingControls
          isTracking={isTracking}
          isPaused={isPaused}
          isSaving={isSaving}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onCancel={handleCancel}
        />
      </div>

      {/* ========== DIALOG WAYPOINT ========== */}
      <WaypointDialog
        showWaypointDialog={showWaypointDialog}
        loadingPreview={loadingPreview}
        waypointPreview={waypointPreview}
        onConfirm={handleConfirmWaypoint}
        onCancel={handleCancelWaypoint}
        formatPreviewDistance={formatPreviewDistance}
        formatPreviewDuration={formatPreviewDuration}
      />
    </div>
  )
}

export default ActiveTracking