// ==========================================
// TRACKING MAP COMPONENT
// ==========================================
// Mappa Leaflet per il tracking GPS
//
// Props:
// - initialCenter: array [lat, lon] centro iniziale mappa
// - currentRouteData: oggetto percorso corrente (con waypoints)
// - trackPoints: array punti GPS tracciati [{lat, lng, ...}]
// - waypoints: array waypoints attivi [{lat, lng, name}]
// - tempWaypoint: oggetto {lat, lng} waypoint temporaneo
// - currentPosition: oggetto {lat, lng} posizione corrente GPS
// - heading: numero direzione movimento (gradi)
// - shouldCenterMap: boolean auto-centra mappa su posizione
// - recalculatingRoute: boolean loading ricalcolo percorso
// - isTracking: boolean tracking attivo
// - isSaving: boolean sta salvando
// - onMapLongPress: function callback long press mappa
// - onMapReady: function callback mappa pronta
// - onCenterMap: function callback ricentra mappa (bottone)
// - onDisableCenter: function callback disabilita auto-center (drag/zoom)
//
// Layout:
// - Mappa Leaflet con TileLayer
// - Percorso pianificato (blu tratteggiato)
// - Traccia GPS (verde)
// - Marker waypoints (arancioni numerati)
// - Marker temporaneo (giallo pulsante)
// - Marker GPS con freccia direzione
// - Bottone ricentra (bottom-right)
// - Loading ricalcolo (center)
//
// FIX APPLICATO: Separato onDisableCenter da onCenterMap
// - onCenterMap: riabilita auto-center (bottone "Centra")
// - onDisableCenter: disabilita auto-center (quando utente muove mappa)
// ==========================================

import React, { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { FaSpinner } from 'react-icons/fa'
import MapLongPressHandler from '../MapLongPressHandler'

/**
 * Componente helper per auto-centrare la mappa sulla posizione corrente
 * Si disabilita automaticamente quando l'utente muove la mappa
 */
const MapCenterController = ({ position, shouldCenter, onMapReady, onDisableCenter }) => {
  const map = useMap()

  // FIX: Pass map reference to parent on mount
  useEffect(() => {
    if (onMapReady) onMapReady(map)
    
    // FIX: Cleanup map on unmount
    return () => {
      if (map) {
        try {
          map.remove()
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }, [map, onMapReady])

  // Rileva quando l'utente muove la mappa manualmente
  useEffect(() => {
    if (!map || !onDisableCenter) return

    const handleUserInteraction = () => {
      onDisableCenter()
    }

    // Ascolta tutti gli eventi di interazione utente
    map.on('dragstart', handleUserInteraction)
    map.on('zoomstart', handleUserInteraction)

    return () => {
      map.off('dragstart', handleUserInteraction)
      map.off('zoomstart', handleUserInteraction)
    }
  }, [map, onDisableCenter])

  useEffect(() => {
    if (shouldCenter && position) {
      map.setView([position.lat, position.lng], map.getZoom())
    }
  }, [position, shouldCenter, map])

  return null
}

/**
 * Componente principale mappa
 */
const TrackingMap = ({
  initialCenter,
  currentRouteData,
  trackPoints,
  waypoints,
  tempWaypoint,
  currentPosition,
  heading,
  shouldCenterMap,
  recalculatingRoute,
  isTracking,
  isSaving,
  onMapLongPress,
  onMapReady,
  onCenterMap,
  onDisableCenter
}) => {
  // FIX: Add key to force remount when needed
  const mapKey = useMemo(() => `map-${Date.now()}`, [])
  
  return (
    <div className="flex-1 relative">
      <MapContainer
        key={mapKey}
        center={initialCenter}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Long Press Handler - Abilita waypoints */}
        <MapLongPressHandler
          onLongPress={onMapLongPress}
          disabled={!isTracking || isSaving}
        />

        {/* Percorso pianificato (BLU TRATTEGGIATO) */}
        {useMemo(() => {
          if (!currentRouteData.coordinates || currentRouteData.coordinates.length === 0) {
            return null
          }

          return (
            <Polyline
              key={`route-${waypoints.length}`}
              positions={currentRouteData.coordinates}
              color="#2563eb"
              weight={4}
              opacity={0.6}
              dashArray="5, 10"
            />
          )
        }, [currentRouteData.coordinates, waypoints.length])}

        {/* Waypoints markers (ARANCIONI NUMERATI) */}
        {waypoints.map((wp, index) => (
          <Marker
            key={`waypoint-${index}`}
            position={[wp.lat, wp.lng]}
            icon={L.divIcon({
              html: `
                <div style="
                  background: #f97316;
                  color: white;
                  border: 3px solid white;
                  border-radius: 50%;
                  width: 30px;
                  height: 30px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 13px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">
                  ${index + 1}
                </div>
              `,
              className: 'waypoint-marker',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })}
          />
        ))}

        {/* Marker temporaneo (GIALLO PULSANTE) */}
        {tempWaypoint && (
          <Marker
            position={[tempWaypoint.lat, tempWaypoint.lng]}
            icon={L.divIcon({
              html: `
                <div style="
                  background: #eab308;
                  color: white;
                  border: 3px solid white;
                  border-radius: 50%;
                  width: 34px;
                  height: 34px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 16px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  animation: pulse 1.5s ease-in-out infinite;
                ">
                  ?
                </div>
                <style>
                  @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                  }
                </style>
              `,
              className: 'temp-waypoint-marker',
              iconSize: [34, 34],
              iconAnchor: [17, 17]
            })}
          />
        )}

        {/* Traccia GPS (VERDE) - mai modificata */}
        {useMemo(() => {
          if (trackPoints.length < 2) return null
          return (
            <Polyline
              key={`track-${trackPoints.length}`}
              positions={trackPoints.map(p => [p.lat, p.lng])}
              color="#10b981"
              weight={5}
              opacity={0.9}
              smoothFactor={1}
            />
          )
        }, [trackPoints])}

        {/* Posizione corrente */}
        {currentPosition && (
          <Marker
            position={[currentPosition.lat, currentPosition.lng]}
            icon={L.divIcon({
              html: `
                <div style="transform: rotate(${heading || 0}deg); width: 36px; height: 36px;">
                  <svg viewBox="0 0 24 24" width="36" height="36">
                    <path fill="#2563eb" stroke="#fff" stroke-width="2"
                          d="M12 2 L4 22 L12 18 L20 22 Z"/>
                    <circle cx="12" cy="12" r="3" fill="#fff"/>
                  </svg>
                </div>
              `,
              className: 'custom-gps-marker',
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            })}
          />
        )}

        {/* Auto-center controller */}
        {currentPosition && (
          <MapCenterController
            position={currentPosition}
            shouldCenter={shouldCenterMap}
            onMapReady={onMapReady}
            onDisableCenter={onDisableCenter}
          />
        )}
      </MapContainer>

      {/* ========== BOTTONE RICENTRA ========== */}
      {isTracking && !shouldCenterMap && (
        <button
          onClick={onCenterMap}
          className="card absolute bottom-4 right-4 z-[1000] p-2 flex items-center space-x-2 hover:scale-105 transition-transform"
          style={{
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow-xl)',
            cursor: 'pointer'
          }}
          title="Ricentra sulla posizione"
        >
          <span className="text-2xl">🎯</span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Centra
          </span>
        </button>
      )}

      {/* ========== LOADING RICALCOLO ========== */}
      {recalculatingRoute && (
        <div className="card absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1500] p-3 flex items-center space-x-2">
          <FaSpinner className="spinner text-lg" style={{ color: 'var(--color-green)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Ricalcolo...
          </span>
        </div>
      )}
    </div>
  )
}

export default TrackingMap