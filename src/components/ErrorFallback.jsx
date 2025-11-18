// ==========================================
// ERROR FALLBACK COMPONENT (FIX)
// ==========================================
// UI mostrata all'utente quando ErrorBoundary cattura un errore
// 
// FIX APPLICATO:
// - Modale full-screen (sempre visibile, non richiede scroll)
// - Design mobile-first con palette Let's Walk
// - Supporto dark mode automatico (CSS variables)
// 
// Funzionalità:
// - Testi in italiano
// - Bottone "Riprova" per reset
// - Bottone "Torna alla Home" per navigazione
// - Stack trace collapsabile in development mode
// - Dettagli tecnici nascosti in production
// ==========================================

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaExclamationTriangle, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import logger from '../utils/logger'

const ErrorFallback = ({ error, errorInfo, resetErrorBoundary, showHome = true }) => {
  const navigate = useNavigate()
  const [showDetails, setShowDetails] = useState(false)
  const isDev = import.meta.env.DEV

  // ==========================================
  // HANDLER: Riprova
  // ==========================================
  const handleRetry = () => {
    logger.log('ErrorFallback: Utente ha cliccato Riprova')
    resetErrorBoundary()
  }

  // ==========================================
  // HANDLER: Torna alla Home
  // ==========================================
  const handleGoHome = () => {
    logger.log('ErrorFallback: Utente torna alla Home')
    // Reset prima di navigare
    resetErrorBoundary()
    navigate('/')
  }

  // ==========================================
  // RENDER - FIX: Modal full-screen
  // ==========================================
  return (
    // FIX: Usa modal-overlay per full-screen
    <div className="modal-overlay">
      <div 
        className="modal-content max-w-md"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '2px solid var(--status-error)'
        }}
      >
        {/* Icona Errore */}
        <div className="flex justify-center mb-6">
          <div 
            className="rounded-full p-4"
            style={{ backgroundColor: 'var(--status-error)' }}
          >
            <FaExclamationTriangle 
              className="text-white text-5xl" 
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Titolo */}
        <h1 
          className="text-2xl font-bold text-center mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          Ops! Qualcosa è andato storto
        </h1>

        {/* Messaggio */}
        <p 
          className="text-center mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          Si è verificato un errore inaspettato. 
          {isDev ? ' Controlla la console per maggiori dettagli.' : ' Riprova o torna alla home.'}
        </p>

        {/* Stack Trace (solo in development) */}
        {isDev && error && (
          <div className="mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <span className="text-sm font-semibold">
                Dettagli tecnici
              </span>
              {showDetails ? (
                <FaChevronUp className="text-sm" />
              ) : (
                <FaChevronDown className="text-sm" />
              )}
            </button>

            {showDetails && (
              <div 
                className="mt-2 p-4 rounded-lg overflow-auto max-h-60 text-xs"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div className="mb-3">
                  <strong style={{ color: 'var(--text-primary)' }}>Errore:</strong>
                  <pre className="mt-1 whitespace-pre-wrap break-words">
                    {error.toString()}
                  </pre>
                </div>
                
                {errorInfo && errorInfo.componentStack && (
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Component Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottoni Azione */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Bottone Riprova */}
          <button
            onClick={handleRetry}
            className="btn-primary flex-1"
            style={{
              backgroundColor: 'var(--color-green)',
              color: 'var(--text-on-gradient)'
            }}
          >
            Riprova
          </button>

          {/* Bottone Torna alla Home */}
          {showHome && (
            <button
              onClick={handleGoHome}
              className="btn-secondary flex-1"
              style={{
                backgroundColor: 'var(--color-orange)',
                color: 'var(--text-on-gradient)'
              }}
            >
              Torna alla Home
            </button>
          )}
        </div>

        {/* Footer Info */}
        {!isDev && (
          <p 
            className="text-xs text-center mt-6"
            style={{ color: 'var(--text-muted)' }}
          >
            Se il problema persiste, contatta il supporto.
          </p>
        )}
      </div>
    </div>
  )
}

export default ErrorFallback