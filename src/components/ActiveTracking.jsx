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
// Dark mode: Supportato tramite CSS variables (--bg-card, --text-primary, ecc.)
// Mobile-first: Layout ottimizzato per schermi piccoli
// ==========================================

import React, { useState, useEffect, useRef } from 'react'
import {
  FaTimes,
  FaMapMarkerAlt,
  FaLayerGroup
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

  // ==========================================
  // REFS - FIX: Aggiunto isMountedRef
  // ==========================================
  const isTrackingRef = useRef(false)
  const isPausedRef = useRef(false)
  const mapRef = useRef(null)
  const isMountedRef = useRef(true) // FIX: Flag per tracciare se componente è montato

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
  // FIX: Wrapper GPS callback con controllo isMounted
  // ==========================================
  const handlePositionUpdateSafe = (position) => {
    // CONTROLLO: Non fare nulla se componente smontato
    if (!isMountedRef.current) {
      logger.warn('GPS update ignorato: componente smontato')
      return
    }
    
    // Procedi normalmente
    handlePositionUpdate(position)
  }

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

      // Avvia GPS con callback protetto
      geolocation.start(
        handlePositionUpdateSafe,  // FIX: Usa versione safe
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
   * FIX: Rimossa chiamata onClose() perché onComplete già chiude il modal
   */
  const handleStop = async () => {
    if (!confirm('Vuoi terminare il percorso e salvare i dati?')) return

    logger.log('ActiveTracking: Stop tracking')
    
    // FIX: Segna come smontato per prevenire update durante salvataggio
    isMountedRef.current = false

    // Ferma GPS
    geolocation.stop()
    setIsTracking(false)
    isTrackingRef.current = false

    // Salva tracking - onComplete gestirà la chiusura del modal
    await saveCompletedTracking()
    
    // NON chiamare onClose() qui! 
    // saveCompletedTracking() chiama onComplete() che già fa setActiveRoute(null)
  }

  /**
   * Annulla tracking senza salvare
   * FIX: Migliorato con flag e delay
   */
  const handleCancel = () => {
    if (!confirm('Vuoi annullare il tracking? I dati non verranno salvati.')) return

    logger.log('ActiveTracking: Annullamento tracking')
    
    // FIX: Segna come smontato per prevenire update
    isMountedRef.current = false
    
    // Ferma GPS
    geolocation.stop()
    
    // Reset state
    setIsTracking(false)
    isTrackingRef.current = false
    
    // Chiudi dopo breve delay per permettere cleanup
    setTimeout(() => {
      onClose()
    }, 100)
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

  // ==========================================
  // FIX: Cleanup migliorato con isMountedRef
  // ==========================================
  useEffect(() => {
    return () => {
      logger.log('ActiveTracking: Cleanup iniziato')
      
      // IMPORTANTE: Segna componente come smontato SUBITO
      isMountedRef.current = false
      
      // Ferma GPS
      geolocation.stop()
      
      // Ferma tracking
      setIsTracking(false)
      isTrackingRef.current = false
      
      // Pulisci mappa se esiste
      if (mapRef.current) {
        try {
          mapRef.current.remove()
          mapRef.current = null
        } catch (error) {
          // Ignora errori cleanup mappa
          logger.warn('Errore cleanup mappa (non critico):', error)
        }
      }
      
      logger.log('ActiveTracking: Cleanup completato')
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

  // ==========================================
  // FIX: handleMapReady protetto
  // ==========================================
  const handleMapReady = (map) => {
    if (!isMountedRef.current) return // Non salvare ref se smontato
    
    mapRef.current = map
    setTimeout(() => {
      if (map && isMountedRef.current) { // Doppio controllo
        map.invalidateSize()
      }
    }, 300)
  }

  // Callback ricentra mappa (quando utente preme bottone "Centra")
  const handleCenterMap = () => {
    setShouldCenterMap(true)
  }

  // FIX: Callback per DISABILITARE auto-center quando utente muove mappa
  const handleDisableCenter = () => {
    setShouldCenterMap(false)
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
                  {isTracking ? (isPaused ? 'In pausa' : 'Tracking attivo') : 'Pronto'}
                </p>
              </div>
            </div>

            {/* Bottone lista waypoints */}
            {waypoints.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowWaypointsList(!showWaypointsList)}
                  className="relative flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-md transition-colors"
                  title="Mostra waypoints"
                >
                  <FaLayerGroup className="text-sm" />
                  <span className="text-sm font-medium">{waypoints.length}</span>
                </button>

                {/* Dropdown lista waypoints */}
                {showWaypointsList && (
                  <div 
                    className="absolute right-0 top-full mt-2 rounded-lg shadow-xl overflow-hidden z-50 min-w-[200px]"
                    style={{ 
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div 
                      className="px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      Waypoints ({waypoints.length}/5)
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {waypoints.map((wp, idx) => (
                        <div 
                          key={idx}
                          className="px-3 py-2 flex items-center justify-between hover:bg-opacity-50 transition-colors"
                          style={{ 
                            backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)'
                          }}
                        >
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            {idx + 1}. {wp.name}
                          </span>
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
          onDisableCenter={handleDisableCenter}
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