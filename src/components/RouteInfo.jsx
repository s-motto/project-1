import React from 'react'
import { FaRoute, FaClock, FaWalking, FaPlay } from 'react-icons/fa'
import SaveRouteButton from './SaveRouteButton'
import { formatDistance, formatElevation } from '../utils/gpsUtils'
import { useSettings } from '../contexts/SettingsContext'

/**
 * Componente RouteInfo - Visualizza le statistiche del percorso e i pulsanti di azione
 * @param {Object} routeInfo - Informazioni del percorso {distance, duration, ascent, descent}
 * @param {Object} fullRouteData - Dati completi del percorso per il salvataggio
 * @param {boolean} isPreloaded - Indica se il percorso è pre-caricato
 * @param {Object} preloadedHike - Percorso hiking pre-caricato
 * @param {boolean} routeSaved - Indica se il percorso è già stato salvato
 * @param {Function} onSaved - Callback quando il percorso viene salvato
 * @param {Function} onStartTracking - Callback per avviare il tracking GPS
 */
const RouteInfo = ({ 
  routeInfo, 
  fullRouteData, 
  isPreloaded, 
  preloadedHike,
  routeSaved, 
  onSaved, 
  onStartTracking
}) => {
  const { settings } = useSettings()

  if (!routeInfo) return null

  return (
    <div className="route-info-container">
      <h3 className="route-info-header">Informazioni Percorso</h3>
      
      {/* Statistiche del percorso */}
      <div className="route-info-stats-grid">
        {/* Distanza */}
        <div className="route-stat-card">
          <FaRoute className="route-stat-icon-distance" />
          <div className="route-stat-details">
            <p className="route-stat-label">Distanza</p>
            <p className="route-stat-value">
              {formatDistance(routeInfo.distance, settings?.distanceUnit || 'km')}
            </p>
          </div>
        </div>

        {/* Durata */}
        <div className="route-stat-card">
          <FaClock className="route-stat-icon-duration" />
          <div className="route-stat-details">
            <p className="route-stat-label">Durata</p>
            <p className="route-stat-value">{routeInfo.duration} min</p>
          </div>
        </div>

        {/* Salita */}
        <div className="route-stat-card">
          <FaWalking className="route-stat-icon-ascent" />
          <div className="route-stat-details">
            <p className="route-stat-label">Salita</p>
            <p className="route-stat-value">
              {formatElevation(routeInfo.ascent, settings?.elevationUnit || 'm')}
            </p>
          </div>
        </div>

        {/* Discesa */}
        <div className="route-stat-card">
          <FaWalking className="route-stat-icon-descent" />
          <div className="route-stat-details">
            <p className="route-stat-label">Discesa</p>
            <p className="route-stat-value">
              {formatElevation(routeInfo.descent, settings?.elevationUnit || 'm')}
            </p>
          </div>
        </div>
      </div>

      {/* Azioni */}
      <div className="mt-4 pt-4 border-t space-y-2">
        {/* Bottone Salva Percorso */}
        {fullRouteData && (!isPreloaded || preloadedHike) && !routeSaved && (
          <SaveRouteButton
            routeData={fullRouteData}
            onSaved={onSaved}
          />
        )}

        {/* Bottone Tracking GPS con Statistiche */}
        <button
          onClick={onStartTracking}
          className="btn-tracking"
        >
          <FaPlay />
          <span>📊 Tracking GPS con Statistiche</span>
        </button>
      </div>
    </div>
  )
}

export default RouteInfo