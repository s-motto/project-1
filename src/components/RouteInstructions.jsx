import React from 'react'
import { formatDurationSeconds, KM_TO_MI, M_TO_FT } from '../utils/gpsUtils'
import { useSettings } from '../contexts/SettingsContext'

/**
 * Componente RouteInstructions - Visualizza le indicazioni turn-by-turn del percorso
 * @param {Array} instructions - Array di istruzioni {instruction, distance, duration}
 */
const RouteInstructions = ({ instructions }) => {
  const { settings } = useSettings()

  // Helper per formattare la distanza di uno step
  const formatStepDistance = (distanceKm) => {
    const dKm = distanceKm || 0 // ORS returns km when units:'km'
    
    if ((settings?.distanceUnit || 'km') === 'mi') {
      if (dKm >= 0.1) return `${(dKm * KM_TO_MI).toFixed(2)} mi`
      const feet = Math.round(dKm * 1000 * M_TO_FT)
      return `${feet} ft`
    } else {
      if (dKm >= 1) return `${dKm.toFixed(2)} km`
      return `${Math.round(dKm * 1000)} m`
    }
  }

  if (!Array.isArray(instructions) || instructions.length === 0) {
    return null
  }

  return (
    <div className="route-instructions-container">
      <h3 className="route-instructions-title">Indicazioni Stradali</h3>
      <div className="route-instructions-list">
        {instructions.map((step, idx) => (
          <div key={idx} className="route-instruction-step">
            <span className="route-instruction-badge">
              {idx + 1}
            </span>
            <div className="route-instruction-content">
              <p className="route-instruction-text">{step.instruction}</p>
              <p className="route-instruction-meta">
                {formatStepDistance(step.distance)} · {formatDurationSeconds(Math.round(step.duration || 0), settings?.durationFormat || 'hms')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RouteInstructions