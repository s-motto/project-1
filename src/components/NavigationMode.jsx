import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faLocationArrow, 
  faRoute, 
  faFlag, 
  faExclamationTriangle,
  faStop,
  faCompass
} from '@fortawesome/free-solid-svg-icons'
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
    <div className="flex flex-col space-y-3">
      {/* Status Bar */}
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 w-full max-w-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faLocationArrow} className="text-lg animate-pulse" />
            <span className="font-bold">Navigazione attiva</span>
          </div>
          <button
            onClick={handleStop}
            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1"
          >
            <FontAwesomeIcon icon={faStop} />
            <span>Stop</span>
          </button>
        </div>
        
        {distanceToEnd !== null && (
          <div className="flex items-center space-x-2 text-sm">
            <FontAwesomeIcon icon={faFlag} />
            <span>
              Distanza destinazione: <strong>{(distanceToEnd * 1000).toFixed(0)} m</strong>
            </span>
          </div>
        )}
      </div>

      {/* Off Route Warning */}
      {isOffRoute && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-md w-full max-w-xl">
          <div className="flex items-center space-x-2 text-yellow-800">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
            <div>
              <p className="font-bold">Fuori percorso!</p>
              <p className="text-sm">Torna sul tracciato consigliato</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Instruction */}
      {currentStep && (
        <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-xl border-l-4 border-blue-600">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
              {currentStepIndex + 1}
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Prossima indicazione</p>
              <p className="text-lg font-bold text-gray-900">{currentStep.instruction}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span>
                  <FontAwesomeIcon icon={faRoute} className="mr-1" />
                  {currentStep.distance >= 1 
                    ? `${currentStep.distance.toFixed(2)} km` 
                    : `${(currentStep.distance * 1000).toFixed(0)} m`}
                </span>
                <span>
                  <FontAwesomeIcon icon={faCompass} className="mr-1" />
                  {Math.round(currentStep.duration / 60)} min
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Next Instruction Preview */}
      {nextStep && (
        <div className="bg-gray-50 rounded-lg shadow p-3 w-full max-w-xl">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Poi</p>
          <p className="text-sm font-medium text-gray-700">{nextStep.instruction}</p>
        </div>
      )}

      {/* Remaining Steps Counter */}
      <div className="bg-white rounded-lg shadow p-3 w-full max-w-xl">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Indicazioni rimanenti</span>
          <span className="font-bold text-blue-600">
            {instructions.length - currentStepIndex - 1}
          </span>
        </div>
      </div>
    </div>
  )
}

export default NavigationMode