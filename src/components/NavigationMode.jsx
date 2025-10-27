import React, { useState, useEffect, useRef } from 'react'
import { FaLocationArrow, FaRoute, FaFlag, FaExclamationTriangle, FaStop, FaCompass } from 'react-icons/fa'
import L from 'leaflet'

const NavigationMode = ({ map, routeLayer, instructions, endPoint, onStop }) => {
  const [currentPosition, setCurrentPosition] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [distanceToEnd, setDistanceToEnd] = useState(null)
  const [isOffRoute, setIsOffRoute] = useState(false)
  const [heading, setHeading] = useState(0)
  const watchIdRef = useRef(null)
  const userMarkerRef = useRef(null)
  const [isTracking, setIsTracking] = useState(false)

  // Calcola distanza tra due punti (formula Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Raggio della Terra in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

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

  // Avvia il tracking GPS
  useEffect(() => {
    if (!map || !routeLayer) return

    setIsTracking(true)

    // Opzioni di geolocalizzazione ad alta precisione
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }

    // Callback per aggiornamenti posizione
    const handlePosition = (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      const accuracy = position.coords.accuracy
      const heading = position.coords.heading || 0

      setCurrentPosition({ lat, lng, accuracy })
      setHeading(heading)

      // Aggiorna o crea il marker dell'utente
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
                transform: translateX(-50%) rotate(${heading}deg);
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
        
        // Aggiungi cerchio di accuratezza
        L.circle([lat, lng], {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1
        }).addTo(map)
      }

      // Centra la mappa sulla posizione
      map.setView([lat, lng], 17, { animate: true })

      // Calcola distanza dalla destinazione
      if (endPoint) {
        const distToEnd = calculateDistance(lat, lng, endPoint.lat, endPoint.lon)
        setDistanceToEnd(distToEnd)

        // Sei arrivato?
        if (distToEnd < 0.05) { // Meno di 50 metri
          handleArrival()
        }
      }

      // Verifica se sei fuori percorso
      const nearestPoint = findNearestPointOnRoute({ lat, lng })
      if (nearestPoint && nearestPoint.distance > 0.05) { // Più di 50m dal percorso
        setIsOffRoute(true)
      } else {
        setIsOffRoute(false)
      }

      // Determina quale step sei vicino
      updateCurrentStep({ lat, lng })
    }

    const handleError = (error) => {
      console.error('GPS Error:', error)
      alert('Errore GPS: ' + error.message)
    }

    // Avvia il watch della posizione
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      geoOptions
    )

    // Cleanup
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (userMarkerRef.current && map) {
        map.removeLayer(userMarkerRef.current)
      }
      setIsTracking(false)
    }
  }, [map, routeLayer, endPoint])

  // Aggiorna lo step corrente basato sulla posizione
  const updateCurrentStep = (position) => {
    // Logica semplificata: avanza allo step successivo quando sei vicino
    // In una versione più sofisticata, useresti la geometria del percorso
    if (currentStepIndex < instructions.length - 1) {
      // Placeholder: avanza dopo tot metri
      // Implementazione completa richiederebbe calcolo del progresso sul percorso
    }
  }

  const handleArrival = () => {
    alert('🎉 Sei arrivato a destinazione!')
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    onStop()
  }

  const handleStop = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    onStop()
  }

  if (!isTracking) {
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

export default NavigationMode