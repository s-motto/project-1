import React, { useState, useEffect, useRef } from 'react' // importo React e gli hook necessari
import useNavigation from '../contexts/NavigationContext' // importo il contesto di navigazione
import { FaLocationArrow, FaRoute, FaFlag, FaExclamationTriangle, FaStop, FaCompass } from 'react-icons/fa' // importo le icone necessarie
import L from 'leaflet' // importo Leaflet per la gestione della mappa
import { calculateDistance, formatDistance, KM_TO_MI, M_TO_FT, formatDurationSeconds } from '../utils/gpsUtils' // importo le funzioni di utilità GPS
import { useSettings } from '../contexts/SettingsContext' // importo il contesto delle impostazioni
import { useToast } from '../contexts/ToastContext' // importo il contesto delle notifiche toast

// Componente NavigationMode per la modalità di navigazione GPS
const NavigationMode = ({ map, routeLayer, instructions, endPoint, onStop, currentPosition, heading }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0) 
  const [distanceToEnd, setDistanceToEnd] = useState(null)  

  const [isOffRoute, setIsOffRoute] = useState(false)
  const userMarkerRef = useRef(null)
  const { toast } = useToast()
  const { settings } = useSettings()

  // Trova il punto più vicino sul percorso
  const findNearestPointOnRoute = (position) => {
    if (!routeLayer) return null
    // Trova il punto più vicino sul percorso  
    let minDistance = Infinity
    let nearestPoint = null
    // Calcola la distanza tra il punto e la posizione attuale
    routeLayer.eachLayer(layer => {
      if (layer.feature && layer.feature.geometry) {
        const coords = layer.feature.geometry.coordinates
        coords.forEach(coord => {
          const dist = calculateDistance(
            position.lat, 
            position.lng, 
            coord[1], 
            coord[0]
          )
          if (dist < minDistance) {
            minDistance = dist
            nearestPoint = { lat: coord[1], lng: coord[0], distance: dist }
          }
        })
      }
    })
    
    return nearestPoint
  }

  // Effetto per aggiornare la posizione dell'utente sulla mappa
  useEffect(() => {
    // Verifica che la mappa e il layer del percorso siano disponibili
    if (!map || !routeLayer) return
    if (!currentPosition) return

    const { lat, lng, accuracy } = currentPosition

    // Aggiorna o crea il marcatore della posizione dell'utente
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng])
    } else {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="
            width: 20px; 
            height: 20px; 
            background: #3b82f6; 
            border: 3px solid white; 
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
            position: relative;
          ">
            <div style="
              position: absolute;
              top: -5px;
              left: 50%;
              transform: translateX(-50%) rotate(${heading || 0}deg);
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-bottom: 10px solid #3b82f6;
            "></div>
          </div>
        `,
        iconSize: [20, 20]
      })
      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(map) // Aggiungo il marcatore alla mappa
      L.circle([lat, lng], { radius: accuracy, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }).addTo(map) // Aggiungo il cerchio di accuratezza
    }

    map.setView([lat, lng], 17, { animate: true })

    // Calcola la distanza alla fine del percorso
    if (endPoint) {
      const distToEnd = calculateDistance(lat, lng, endPoint.lat, endPoint.lon)
      setDistanceToEnd(distToEnd)
      if (distToEnd < 0.05) handleArrival()
    }
    
    const nearestPoint = findNearestPointOnRoute({ lat, lng })
    if (nearestPoint && nearestPoint.distance > 0.05) setIsOffRoute(true)
    else setIsOffRoute(false)

    updateCurrentStep({ lat, lng })

    // Pulizia del marcatore alla rimozione del componente
  }, [map, routeLayer, endPoint, currentPosition, heading])
 // Pulizia del marcatore alla rimozione del componente
  useEffect(() => {
    return () => {
      if (userMarkerRef.current && map) {
        map.removeLayer(userMarkerRef.current)
        userMarkerRef.current = null
      }
    }
  }, [map])

  // Aggiorna lo step corrente basato sulla posizione
  const updateCurrentStep = (position) => {
    // Logica semplificata: avanza allo step successivo quando sei vicino
    
    if (currentStepIndex < instructions.length - 1) {
      // Placeholder: avanza dopo tot metri
      
    }
  }
  // Gestisce l'arrivo a destinazione
  const handleArrival = () => {
    toast.success('🎉 Sei arrivato a destinazione!')
    onStop()
  }
  // Gestisce lo stop della navigazione
  const handleStop = () => {
    onStop()
  }

  // Render del componente
  if (!currentPosition) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-xl">
        <p className="text-center text-gray-600">Avvio navigazione GPS...</p>
      </div>
    )
  }

  const currentStep = instructions[currentStepIndex] // Step corrente
  const nextStep = instructions[currentStepIndex + 1] // Prossimo step

  return (
    <div className="navigation-container">
      {/* Status Bar */}
      <div className="nav-status-top">
        {/* GPS status badge from NavigationContext */}
        <GPSStatusBadge currentPosition={currentPosition} />
      </div>
      <div className="nav-status-card">
        <div className="nav-status-header">
          <div className="nav-status-title">
            <FaLocationArrow className="nav-status-icon" />
            <span className="nav-status-text">Navigazione attiva</span>
          </div>
          <button
            onClick={handleStop}
            className="nav-stop-btn"
          >
            <FaStop />
            <span>Stop</span>
          </button>
        </div>
        
        {distanceToEnd !== null && (
          <div className="flex items-center space-x-2 text-sm">
            <FaFlag />
            <span>
              Distanza destinazione: <strong>{formatDistance(distanceToEnd, settings?.distanceUnit || 'km')}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Off Route Warning */}
      {isOffRoute && (
        <div className="nav-off-route-warning">
          <div className="nav-warning-content">
            <FaExclamationTriangle className="nav-warning-icon" />
            <div className="nav-warning-text-container">
              <p className="nav-warning-title">Fuori percorso!</p>
              <p className="nav-warning-description">Torna sul tracciato consigliato</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Instruction */}
      {currentStep && (
        <div className="nav-current-instruction">
          <div className="nav-instruction-content">
            <div className="nav-instruction-number">
              {currentStepIndex + 1}
            </div>
            <div className="nav-instruction-details">
              <p className="nav-instruction-label">Prossima indicazione</p>
              <p className="nav-instruction-text">{currentStep.instruction}</p>
              <div className="nav-instruction-meta">
                <span>
                  <FaRoute className="mr-1" />
                  {(() => {
                    const dKm = currentStep.distance || 0
                    if ((settings?.distanceUnit || 'km') === 'mi') {
                      if (dKm >= 0.1) return `${(dKm * KM_TO_MI).toFixed(2)} mi`
                      return `${Math.round(dKm * 1000 * M_TO_FT)} ft`
                    }
                    if (dKm >= 1) return `${dKm.toFixed(2)} km`
                    return `${Math.round(dKm * 1000)} m`
                  })()}
                </span>
                <span>
                  <FaCompass className="mr-1" />
                  {formatDurationSeconds(Math.round(currentStep.duration || 0), settings?.durationFormat || 'hms')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Next Instruction Preview */}
      {nextStep && (
        <div className="nav-next-instruction">
          <p className="nav-next-label">Poi</p>
          <p className="nav-next-text">{nextStep.instruction}</p>
        </div>
      )}

      {/* Remaining Steps Counter */}
      <div className="nav-remaining-card">
  <div className="nav-remaining-content">
    <span>Indicazioni rimanenti</span>
    <span className="nav-remaining-count">
      {instructions.length - currentStepIndex - 1}
    </span>
  </div>
</div>
    </div>
  )
}

function GPSStatusBadge({ currentPosition }) {
  // Gestisce lo stato del GPS
  try {
    const { isNavigating, error } = useNavigation()
    let text = 'GPS: in attesa'
    let cls = 'gps-badge waiting'
    if (error) {
      text = `GPS: errore` + (error.message ? `: ${error.message}` : '')
      cls = 'gps-badge error'
    } else if (isNavigating && currentPosition) {
      text = 'GPS: attivo'
      cls = 'gps-badge active'
    } else if (isNavigating) {
      text = 'GPS: in attesa'
      cls = 'gps-badge waiting'
    }
// Render badge
    return (
      <div className={cls} style={{ padding: '6px 10px', borderRadius: 16, background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'inline-block', fontSize: 14 }}>
        {text}
      </div>
    )
  } catch (e) {
    // Se qualcosa va storto, non mostrare nulla
    return null
  }
}

export default NavigationMode