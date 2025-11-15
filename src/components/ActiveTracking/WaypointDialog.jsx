// ==========================================

// WAYPOINT DIALOG COMPONENT

// ==========================================

// Modal di conferma per aggiungere un waypoint

//

// Props:

// - showWaypointDialog: boolean mostra/nascondi dialog

// - loadingPreview: boolean loading durante calcolo preview

// - waypointPreview: oggetto {distance, duration, name} preview percorso

// - onConfirm: function callback conferma waypoint

// - onCancel: function callback annulla waypoint

// - formatPreviewDistance: function formatta distanza

// - formatPreviewDuration: function formatta durata

//

// Layout:

// - Header con emoji 📍

// - Se loading: spinner + messaggio

// - Se preview pronto: nome luogo + statistiche (distanza/tempo)

// - Bottoni: Annulla / Conferma

// ==========================================

 

import React from 'react'

import { FaSpinner } from 'react-icons/fa'

 

const WaypointDialog = ({

  showWaypointDialog,

  loadingPreview,

  waypointPreview,

  onConfirm,

  onCancel,

  formatPreviewDistance,

  formatPreviewDuration

}) => {

  if (!showWaypointDialog) return null

 

  return (

    <div className="modal-overlay" style={{ zIndex: 2000 }}>

      <div

        className="card mx-4"

        style={{

          maxWidth: '320px',

          padding: '1rem',

          margin: '0 auto',

          marginTop: '25vh',

          boxShadow: 'var(--shadow-xl)'

        }}

      >

        {/* Header */}

        <div className="flex items-center space-x-2 mb-3">

          <span className="text-xl">📍</span>

          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>

            Aggiungi Waypoint?

          </h3>

        </div>

 

        {/* Contenuto */}

        {loadingPreview ? (

          // Loading

          <div className="flex flex-col items-center py-4 space-y-2">

            <FaSpinner className="spinner text-xl" style={{ color: 'var(--color-green)' }} />

            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>

              Calcolo percorso...

            </p>

          </div>

        ) : waypointPreview ? (

          // Preview caricata

          <div className="space-y-2">

            {/* Nome del luogo */}

            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>

              {waypointPreview.name}

            </div>

 

            {/* Statistiche preview */}

            <div

              className="flex items-center justify-around py-2 rounded-lg"

              style={{ backgroundColor: 'var(--bg-secondary)' }}

            >

              <div className="text-center">

                <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>

                  Distanza

                </div>

                <div className="font-bold text-xs" style={{ color: 'var(--icon-distance)' }}>

                  📏 {formatPreviewDistance(waypointPreview.distance)}

                </div>

              </div>

              <div className="text-center">

                <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>

                  Tempo

                </div>

                <div className="font-bold text-xs" style={{ color: 'var(--icon-duration)' }}>

                  ⏱️ {formatPreviewDuration(waypointPreview.duration)}

                </div>

              </div>

            </div>

 

            {/* Info */}

            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>

              Il percorso verrà ricalcolato con questo waypoint

            </p>

          </div>

        ) : (

          // Errore

          <div className="text-center py-3">

            <p className="text-xs" style={{ color: 'var(--status-error)' }}>

              Errore nel calcolo del percorso

            </p>

          </div>

        )}

 

        {/* Bottoni */}

        <div className="flex space-x-2 mt-3">

          <button

            onClick={onCancel}

            className="btn-secondary flex-1"

            style={{ padding: '0.5rem' }}

            disabled={loadingPreview}

          >

            Annulla

          </button>

          <button

            onClick={onConfirm}

            className="btn-primary flex-1"

            style={{ padding: '0.5rem' }}

            disabled={loadingPreview || !waypointPreview}

          >

            Conferma

          </button>

        </div>

      </div>

    </div>

  )

}

 

export default WaypointDialog