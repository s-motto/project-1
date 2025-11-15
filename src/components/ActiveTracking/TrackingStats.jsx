// ==========================================

// TRACKING STATS COMPONENT

// ==========================================

// Statistiche in tempo reale durante il tracking GPS

//

// Props:

// - distance: numero distanza percorsa in km

// - elapsedTime: numero secondi trascorsi

// - elevationGain: numero metri di salita

// - elevationLoss: numero metri di discesa

// - avgSpeed: numero velocità media km/h

// - settings: oggetto impostazioni utente

// - waypoints: array waypoints attivi

// - currentRouteData: oggetto percorso corrente (con waypoints)

//

// Layout:

// - 3 card sopra: Distanza, Tempo, Velocità

// - 2 card sotto: Salita, Discesa

// - Se ci sono waypoints, mostra confronto con dati pianificati

// ==========================================

 

import React from 'react'

import {

  formatDistance,

  formatSpeedKmh,

  formatElevation,

  formatDurationSeconds

} from '../../utils/gpsUtils'

 

const TrackingStats = ({

  distance,

  elapsedTime,

  elevationGain,

  elevationLoss,

  avgSpeed,

  settings,

  waypoints,

  currentRouteData

}) => {

  // Formatta valori con unità utente

  const distanceLabel = formatDistance(distance, settings?.distanceUnit || 'km')

  const speedLabel = formatSpeedKmh(avgSpeed, settings?.distanceUnit || 'km')

  const gainLabel = formatElevation(elevationGain, settings?.elevationUnit || 'm')

  const lossLabel = formatElevation(elevationLoss, settings?.elevationUnit || 'm')

 

  return (

    <div

      className="card border-t"

      style={{

        borderColor: 'var(--border-color)',

        padding: '0.75rem'

      }}

    >

      {/* Grid superiore: Distanza, Tempo, Velocità */}

      <div className="grid grid-cols-3 gap-2 text-center">

        {/* Distanza */}

        <div>

          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>

            Distanza

          </p>

          <p className="text-base font-bold" style={{ color: 'var(--icon-distance)' }}>

            {distanceLabel}

          </p>

          {waypoints.length > 0 && (

            <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>

              Piano: {formatDistance(currentRouteData.distance, settings?.distanceUnit || 'km')}

            </p>

          )}

        </div>

 

        {/* Tempo */}

        <div>

          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>

            Tempo

          </p>

          <p className="text-base font-bold" style={{ color: 'var(--icon-duration)' }}>

            {formatDurationSeconds(elapsedTime, settings?.durationFormat || 'hms')}

          </p>

          {waypoints.length > 0 && (

            <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>

              Stima: {Math.round(currentRouteData.duration)}min

            </p>

          )}

        </div>

 

        {/* Velocità */}

        <div>

          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>

            Velocità

          </p>

          <p className="text-base font-bold" style={{ color: 'var(--icon-distance)' }}>

            {speedLabel}

          </p>

        </div>

      </div>

 

      {/* Grid inferiore: Salita, Discesa */}

      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>

        <div className="text-center">

          <p className="mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>

            ↗ Salita

          </p>

          <p className="text-sm font-bold" style={{ color: 'var(--icon-ascent)' }}>

            {gainLabel}

          </p>

          {waypoints.length > 0 && (

            <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>

              Piano: {formatElevation(currentRouteData.ascent, settings?.elevationUnit || 'm')}

            </p>

          )}

        </div>

        <div className="text-center">

          <p className="mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>

            ↘ Discesa

          </p>

          <p className="text-sm font-bold" style={{ color: 'var(--icon-descent)' }}>

            {lossLabel}

          </p>

          {waypoints.length > 0 && (

            <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>

              Piano: {formatElevation(currentRouteData.descent, settings?.elevationUnit || 'm')}

            </p>

          )}

        </div>

      </div>

    </div>

  )

}

 

export default TrackingStats