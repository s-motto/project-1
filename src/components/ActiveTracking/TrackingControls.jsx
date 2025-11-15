// ==========================================

// TRACKING CONTROLS COMPONENT

// ==========================================

// Bottoni di controllo per il tracking GPS

//

// Props:

// - isTracking: boolean se tracking è attivo

// - isPaused: boolean se tracking è in pausa

// - isSaving: boolean se sta salvando

// - onStart: function callback avvia tracking

// - onPause: function callback pausa tracking

// - onResume: function callback riprendi tracking

// - onStop: function callback termina e salva

// - onCancel: function callback annulla tracking

//

// Layout:

// - Se NON tracking: bottone "Avvia"

// - Se tracking:

//   - Pausa/Riprendi (toggle)

//   - Fine (con loading se sta salvando)

//   - Annulla

// ==========================================

 

import React from 'react'

import {

  FaPlay,

  FaPause,

  FaStop,

  FaTimes,

  FaSpinner

} from 'react-icons/fa'

 

const TrackingControls = ({

  isTracking,

  isPaused,

  isSaving,

  onStart,

  onPause,

  onResume,

  onStop,

  onCancel

}) => {

  return (

    <div

      className="card border-t flex-center space-x-2"

      style={{

        borderColor: 'var(--border-color)',

        padding: '0.75rem',

        flexShrink: 0

      }}

    >

      {!isTracking ? (

        // Bottone Avvia

        <button

          onClick={onStart}

          className="btn-primary"

          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}

        >

          <FaPlay className="mr-1" /> Avvia

        </button>

      ) : (

        // Bottoni durante tracking

        <>

          {/* Pausa/Riprendi */}

          {!isPaused ? (

            <button

              onClick={onPause}

              className="btn-secondary"

              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}

            >

              <FaPause className="mr-1" /> Pausa

            </button>

          ) : (

            <button

              onClick={onResume}

              className="btn-primary"

              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}

            >

              <FaPlay className="mr-1" /> Riprendi

            </button>

          )}

 

          {/* Fine */}

          <button

            onClick={onStop}

            className="btn-danger"

            disabled={isSaving}

            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}

          >

            {isSaving ? (

              <>

                <FaSpinner className="spinner mr-1" />

                Salvo...

              </>

            ) : (

              <>

                <FaStop className="mr-1" />

                Fine

              </>

            )}

          </button>

 

          {/* Annulla */}

          <button

            onClick={onCancel}

            className="btn-secondary"

            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}

          >

            <FaTimes className="mr-1" /> Annulla

          </button>

        </>

      )}

    </div>

  )

}

 

export default TrackingControls