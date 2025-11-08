import React from 'react'
import { FaMapMarkerAlt, FaFlag, FaTimes, FaExchangeAlt } from 'react-icons/fa'

const MapPointSelector = ({ location, onSetStart, onSetEnd, onSwap, onClose }) => {
  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div 
        className="modal-backdrop"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="modal-container w-full-max-md animate-slide-in-right">
        {/* Header */}
        <div className="modal-header-gradient">
          <div className="flex-between">
            <div className="space-x-3-items">
              <div className="text-3xl">📍</div>
              <div>
                <h3 className="text-xl font-bold">Punto Selezionato</h3>
                <p className="text-sm opacity-90">Scegli come usarlo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="icon-btn-white"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Location Info */}
          <div className="card-beige">
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>📍 Posizione:</p>
            <p className="text-xs break-words" style={{ color: 'var(--text-primary)' }}>{location.name}</p>
            <p className="text-xsmt-1" style={{ color: 'var(--text-primary)' }}>
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onSetStart}
              className="btn-green w-full shadow-md hover:shadow-lg"
            >
              <FaMapMarkerAlt className="text-lg" />
              <span>Imposta come Partenza</span>
            </button>

            <button
              onClick={onSetEnd}
              className="btn-danger w-full shadow-md hover:shadow-lg"
            >
              <FaFlag className="text-lg" />
              <span>Imposta come Arrivo</span>
            </button>

            {onSwap && (
              <button
                onClick={onSwap}
                className="btn-primary w-full shadow-md hover:shadow-lg"
              >
                <FaExchangeAlt className="text-lg" />
                <span>Inverti Partenza/Arrivo</span>
              </button>
            )}
          </div>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="btn-ghost w-full"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

export default MapPointSelector