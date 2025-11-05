import React from 'react'
import { FaMapMarkerAlt, FaFlag, FaTimes, FaExchangeAlt } from 'react-icons/fa'

const MapPointSelector = ({ location, onSetStart, onSetEnd, onSwap, onClose }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in-right">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#A9CBB7] to-[#FF934F] text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">📍</div>
              <div>
                <h3 className="text-xl font-bold">Punto Selezionato</h3>
                <p className="text-sm opacity-90">Scegli come usarlo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Location Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">📍 Posizione:</p>
            <p className="text-xs text-gray-600 break-words">{location.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onSetStart}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md hover:shadow-lg"
            >
              <FaMapMarkerAlt className="text-lg" />
              <span>Imposta come Partenza</span>
            </button>

            <button
              onClick={onSetEnd}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md hover:shadow-lg"
            >
              <FaFlag className="text-lg" />
              <span>Imposta come Arrivo</span>
            </button>

            {onSwap && (
              <button
                onClick={onSwap}
                className="w-full bg-[#A9CBB7] hover:bg-[#98baa7] text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md hover:shadow-lg"
              >
                <FaExchangeAlt className="text-lg" />
                <span>Inverti Partenza/Arrivo</span>
              </button>
            )}
          </div>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

export default MapPointSelector