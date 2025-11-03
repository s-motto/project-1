import React, { useState, useEffect, useRef } from 'react'
import { FaPlay, FaPause, FaStop, FaTimes, FaMapMarkerAlt } from 'react-icons/fa'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import useGeolocation from '../hooks/useGeolocation'
import routesService from '../services/routesService'
import { useAuth } from '../contexts/AuthContext'
import {
  calculateDistance,
  calculateTotalDistance,
  calculateElevationGain,
  calculateElevationLoss,
  formatTime,
  calculateSpeed
} from '../utils/gpsUtils'
import 'leaflet/dist/leaflet.css'

// Componente per centrare la mappa sulla posizione corrente
function MapCenterController({ position }) {
  const map = useMap()
  
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom())
    }
  }, [position, map])
  
  return null
}

/**
 * Componente per tracking GPS in tempo reale
 */
const ActiveTracking = ({ route, onClose, onComplete }) => {
  const { user } = useAuth()
  const geolocation = useGeolocation()
  
  // Stati
  const [isTracking, setIsTracking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [trackPoints, setTrackPoints] = useState([])
  const [currentPosition, setCurrentPosition] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [distance, setDistance] = useState(0)
  const [elevationGain, setElevationGain] = useState(0)
  const [elevationLoss, setElevationLoss] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  
  // Refs
  const startTimeRef = useRef(null)
  const pausedTimeRef = useRef(0)
  const timerRef = useRef(null)
  const watchIdRef = useRef(null)

  // Gestisce il blur della mappa quando la modale è aperta
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  // Timer per tempo trascorso
  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTimeRef.current - pausedTimeRef.current) / 1000)
        setElapsedTime(elapsed)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isTracking, isPaused])

  // Gestione posizione GPS
  const handlePositionUpdate = (position) => {
    const newPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      altitude: position.coords.altitude,
      timestamp: position.timestamp
    }
    
    setCurrentPosition(newPoint)
    
    // Aggiungi punto solo se non in pausa
    if (!isPaused) {
      setTrackPoints(prev => {
        const updated = [...prev, newPoint]
        
        // Calcola distanza
        if (updated.length > 1) {
          const newDistance = calculateTotalDistance(updated)
          setDistance(newDistance)
          
          // Calcola dislivelli se disponibile altitudine
          if (newPoint.altitude) {
            setElevationGain(calculateElevationGain(updated))
            setElevationLoss(calculateElevationLoss(updated))
          }
        }
        
        return updated
      })
    }
  }

  const handlePositionError = (error) => {
    console.error('GPS Error:', error)
    alert('Errore GPS: ' + error.message)
  }

  // Avvia tracking
  const handleStart = () => {
    if (!isTracking) {
      // Primo avvio
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      setIsTracking(true)
      setIsPaused(false)
      
      // Avvia GPS
      watchIdRef.current = geolocation.start(
        handlePositionUpdate,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    }
  }

  // Pausa tracking
  const handlePause = () => {
    if (!isPaused) {
      const now = Date.now()
      pausedTimeRef.current += now - startTimeRef.current - elapsedTime * 1000
      setIsPaused(true)
    }
  }

  // Riprendi tracking
  const handleResume = () => {
    if (isPaused) {
      setIsPaused(false)
    }
  }

  // Termina e salva
  const handleStop = async () => {
    if (!confirm('Vuoi terminare il percorso e salvare i dati?')) return
    
    setIsSaving(true)
    
    // Ferma GPS
    geolocation.stop()
    setIsTracking(false)
    
    try {
      // Prepara i dati da salvare
      const completedData = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        actualDistance: parseFloat(distance.toFixed(2)),
        actualDuration: Math.floor(elapsedTime / 60), // Converti in minuti
        actualAscent: elevationGain,
        actualDescent: elevationLoss,
        actualCoordinates: JSON.stringify(trackPoints) // Salva la traccia GPS reale
      }
      
      // Aggiorna il percorso
      const result = await routesService.updateRoute(route.$id, completedData)
      
      if (result.success) {
        alert('✅ Percorso completato e salvato!')
        if (onComplete) onComplete()
        onClose()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error saving track:', error)
      alert('Errore nel salvare il percorso: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Annulla tracking
  const handleCancel = () => {
    if (!confirm('Vuoi annullare il tracking? I dati non verranno salvati.')) return
    
    geolocation.stop()
    setIsTracking(false)
    onClose()
  }

  // Velocità media
  const avgSpeed = calculateSpeed(distance, elapsedTime)

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="modal-header-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaMapMarkerAlt className="text-3xl" />
              <div>
                <h2 className="text-2xl font-bold">{route.name}</h2>
                <p className="text-sm text-blue-100">
                  {isTracking ? (isPaused ? '⏸️ In pausa' : '🔴 Registrazione in corso') : '⏺️ Pronto per iniziare'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleCancel} 
              className="modal-close-btn"
              aria-label="Chiudi"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* Statistiche live */}
        <div className="p-4 bg-gray-50 border-b grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">Distanza</p>
            <p className="text-lg font-bold text-blue-600">{distance.toFixed(2)} km</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Tempo</p>
            <p className="text-lg font-bold text-purple-600">{formatTime(elapsedTime)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Velocità</p>
            <p className="text-lg font-bold text-green-600">{avgSpeed} km/h</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">D+ ⛰️</p>
            <p className="text-lg font-bold text-orange-600">{elevationGain} m</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">D- ⛰️</p>
            <p className="text-lg font-bold text-red-600">{elevationLoss} m</p>
          </div>
        </div>

        {/* Mappa */}
        <div className="flex-1 relative">
          <MapContainer
            center={currentPosition ? [currentPosition.lat, currentPosition.lng] : [45.4642, 9.1900]}
            zoom={15}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Traccia GPS */}
            {trackPoints.length > 1 && (
              <Polyline 
                positions={trackPoints.map(p => [p.lat, p.lng])}
                color="#3B82F6"
                weight={4}
                opacity={0.8}
              />
            )}
            
            {/* Posizione corrente */}
            {currentPosition && (
              <Marker position={[currentPosition.lat, currentPosition.lng]}>
              </Marker>
            )}
            
            {/* Auto-centra sulla posizione */}
            {currentPosition && <MapCenterController position={currentPosition} />}
          </MapContainer>
          
          {/* Info GPS */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 text-xs">
            <p className="font-bold">Punti GPS: {trackPoints.length}</p>
            {currentPosition && (
              <>
                <p>Lat: {currentPosition.lat.toFixed(6)}</p>
                <p>Lng: {currentPosition.lng.toFixed(6)}</p>
                {currentPosition.altitude && (
                  <p>Alt: {Math.round(currentPosition.altitude)}m</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Controlli */}
        <div className="p-4 bg-white border-t flex justify-center space-x-3">
          {!isTracking ? (
            <button
              onClick={handleStart}
              className="btn-primary flex items-center space-x-2 px-6 py-3"
            >
              <FaPlay />
              <span>Inizia Percorso</span>
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="btn-warning flex items-center space-x-2 px-6 py-3"
                >
                  <FaPause />
                  <span>Pausa</span>
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="btn-primary flex items-center space-x-2 px-6 py-3"
                >
                  <FaPlay />
                  <span>Riprendi</span>
                </button>
              )}
              
              <button
                onClick={handleStop}
                disabled={isSaving || trackPoints.length < 2}
                className="btn-success flex items-center space-x-2 px-6 py-3 disabled:opacity-50"
              >
                <FaStop />
                <span>{isSaving ? 'Salvataggio...' : 'Termina e Salva'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActiveTracking