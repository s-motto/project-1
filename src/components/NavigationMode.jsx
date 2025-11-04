import React, { useState, useEffect, useRef } from 'react'
import useNavigation from '../contexts/NavigationContext'
import { FaLocationArrow, FaRoute, FaFlag, FaExclamationTriangle, FaStop, FaCompass } from 'react-icons/fa'
import L from 'leaflet'
import { calculateDistance } from '../utils/gpsUtils'
import { useToast } from '../contexts/ToastContext'

const NavigationMode = ({ map, routeLayer, instructions, endPoint, onStop, currentPosition, heading }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [distanceToEnd, setDistanceToEnd] = useState(null)
  const [isOffRoute, setIsOffRoute] = useState(false)
  const userMarkerRef = useRef(null)
  const { toast } = useToast()

 

  // Trova il punto più vicino sul percorso
  const findNearestPointOnRoute = (position) => {
    if (!routeLayer) return null
    
    let minDistance = Infinity
    let nearestPoint = null
    
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

  // React to external currentPosition prop (managed by parent hook)
  useEffect(() => {
    // Update user marker and map view when position or map/route change
    if (!map || !routeLayer) return
    if (!currentPosition) return

    const { lat, lng, accuracy } = currentPosition

    // Update or create user marker
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
      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(map)
      L.circle([lat, lng], { radius: accuracy, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }).addTo(map)
    }

    map.setView([lat, lng], 17, { animate: true })

    // Calculate distance to end and off-route
    if (endPoint) {
      const distToEnd = calculateDistance(lat, lng, endPoint.lat, endPoint.lon)
      setDistanceToEnd(distToEnd)
      if (distToEnd < 0.05) handleArrival()
    }

    const nearestPoint = findNearestPointOnRoute({ lat, lng })
    if (nearestPoint && nearestPoint.distance > 0.05) setIsOffRoute(true)
    else setIsOffRoute(false)

    updateCurrentStep({ lat, lng })

    // Cleanup function to remove marker if needed
  }, [map, routeLayer, endPoint, currentPosition, heading])

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

  const handleArrival = () => {
    toast.success('🎉 Sei arrivato a destinazione!')
    onStop()
  }

  const handleStop = () => {
    onStop()
  }

  // Show a loading state until we have a position
  if (!currentPosition) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-xl">
        <p className="text-center text-gray-600">Avvio navigazione GPS...</p>
      </div>
    )
  }

  const currentStep = instructions[currentStepIndex]
  const nextStep = instructions[currentStepIndex + 1]

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
              Distanza destinazione: <strong>{(distanceToEnd * 1000).toFixed(0)} m</strong>
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
                  {currentStep.distance >= 1 
                    ? `${currentStep.distance.toFixed(2)} km` 
                    : `${(currentStep.distance * 1000).toFixed(0)} m`}
                </span>
                <span>
                 <FaCompass className="mr-1" />

                  {Math.round(currentStep.duration / 60)} min
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
  // use context to read error/isNavigating
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