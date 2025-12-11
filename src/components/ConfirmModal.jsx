import React from 'react'
import { FaExclamationTriangle, FaTimes, FaCheckCircle, FaTrash } from 'react-icons/fa'

/**
 * Modal di conferma riutilizzabile
 * Sostituisce window.confirm() con un modal custom che segue il design system
 * 
 * @param {boolean} isOpen - Se il modal è visibile
 * @param {string} title - Titolo del modal
 * @param {string} message - Messaggio di conferma
 * @param {string} confirmText - Testo del pulsante di conferma (default: "Conferma")
 * @param {string} cancelText - Testo del pulsante di annullamento (default: "Annulla")
 * @param {string} variant - Variante colore: 'danger' | 'warning' | 'success' (default: 'warning')
 * @param {boolean} isLoading - Se mostrare lo stato di caricamento
 * @param {function} onConfirm - Callback quando si conferma
 * @param {function} onCancel - Callback quando si annulla
 */
const ConfirmModal = ({
  isOpen,
  title = 'Conferma',
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  variant = 'warning',
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  // Configurazione varianti - colori che funzionano in light e dark mode
  const variantConfig = {
    danger: {
      icon: FaTrash,
      iconColor: '#ef4444', // red-500
      buttonBg: '#dc2626', // red-600
      buttonHover: '#b91c1c', // red-700
    },
    warning: {
      icon: FaExclamationTriangle,
      iconColor: '#f59e0b', // amber-500
      buttonBg: '#d97706', // amber-600
      buttonHover: '#b45309', // amber-700
    },
    success: {
      icon: FaCheckCircle,
      iconColor: '#22c55e', // green-500
      buttonBg: '#16a34a', // green-600
      buttonHover: '#15803d', // green-700
    }
  }

  const config = variantConfig[variant] || variantConfig.warning
  const IconComponent = config.icon

  // Gestione click fuori dal modal
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel()
    }
  }

  // Gestione tasto Escape
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isLoading, onCancel])

  return (
    <div 
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div 
        className="rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <IconComponent 
                className="text-2xl" 
                style={{ color: config.iconColor }}
              />
              <h3 
                id="confirm-modal-title"
                className="text-lg font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-2 rounded-full transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Chiudi"
            >
              <FaTimes className="text-lg" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>
        </div>

        {/* Footer con pulsanti */}
        <div 
          className="px-6 py-4 flex justify-end space-x-3 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2 text-white"
            style={{ backgroundColor: config.buttonBg }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = config.buttonHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = config.buttonBg}
          >
            {isLoading && (
              <svg 
                className="animate-spin h-4 w-4" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal