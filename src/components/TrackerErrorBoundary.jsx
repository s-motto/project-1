// ==========================================
// TRACKER ERROR BOUNDARY COMPONENT (FIX)
// ==========================================
// Error Boundary specifico per il GPS tracking
// 
// FIX APPLICATO:
// - Non richiede più trackingData in props (sempre vuoti)
// - Prova a estrarre dati dal componente ActiveTracking crashato
// - Se non ci sono dati → mostra messaggio appropriato
// - Fallback modale full-screen (sempre visibile)
//
// Uso:
// <TrackerErrorBoundary
//   user={user}
//   route={route}
//   onGoHome={() => { ... }}
// >
//   <ActiveTracking ... />
// </TrackerErrorBoundary>
// ==========================================

import React from 'react'
import { FaExclamationCircle, FaSave } from 'react-icons/fa'
import routesService from '../services/routesService'
import logger from '../utils/logger'

class TrackerErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      emergencySaved: false,
      emergencySaveError: null
    }
  }

  // ==========================================
  // LIFECYCLE: Aggiorna state quando si verifica un errore
  // ==========================================
  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  // ==========================================
  // LIFECYCLE: Salva dati GPS prima del crash
  // ==========================================
  async componentDidCatch(error, errorInfo) {
    logger.error('TrackerErrorBoundary catturato errore durante tracking:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    })

    // Salva error info
    this.setState({
      error,
      errorInfo
    })

    // CRITICO: Prova a salvare i dati GPS prima di mostrare il fallback
    await this.attemptEmergencySave()
  }

  // ==========================================
  // EMERGENCY SAVE: Salva trackPoints su Appwrite
  // FIX: Prova a estrarre dati da localStorage o skip
  // ==========================================
  attemptEmergencySave = async () => {
    const { user, route } = this.props

    // FIX: Prova a recuperare dati da localStorage (fallback)
    let trackingData = null
    try {
      const tempData = localStorage.getItem('active_tracking_temp')
      if (tempData) {
        trackingData = JSON.parse(tempData)
      }
    } catch (e) {
      logger.warn('TrackerErrorBoundary: Impossibile recuperare dati tracking da localStorage')
    }

    // Verifica che abbiamo dati da salvare
    if (!trackingData || !trackingData.trackPoints || trackingData.trackPoints.length === 0) {
      logger.warn('TrackerErrorBoundary: Nessun trackPoint da salvare')
      this.setState({ 
        emergencySaveError: 'Nessun dato GPS disponibile per il salvataggio di emergenza' 
      })
      return
    }

    try {
      logger.log('TrackerErrorBoundary: Tentativo salvataggio emergenza...', {
        trackPointsCount: trackingData.trackPoints.length,
        distance: trackingData.distance,
        elapsedTime: trackingData.elapsedTime
      })

      // Prepara i dati per il salvataggio
      const emergencyRouteData = {
        name: `[EMERGENZA] ${route.name || 'Percorso tracciato'}`,
        startPoint: route.startPoint,
        endPoint: route.endPoint,
        
        // Dati pianificati originali
        distance: route.distance,
        duration: route.duration,
        ascent: route.ascent || 0,
        descent: route.descent || 0,
        coordinates: route.coordinates,
        instructions: Array.isArray(route.instructions) ? route.instructions : [],
        
        // Dati tracking effettivi
        actualDistance: parseFloat(trackingData.distance.toFixed(2)),
        actualDuration: Math.floor(trackingData.elapsedTime / 60),
        actualAscent: trackingData.elevationGain || 0,
        actualDescent: trackingData.elevationLoss || 0,
        actualCoordinates: JSON.stringify(trackingData.trackPoints),
        
        // Flag per indicare salvataggio di emergenza
        status: 'emergency_save',
        emergencySavedAt: new Date().toISOString()
      }

      // Salva su Appwrite
      const result = await routesService.saveRoute(emergencyRouteData, user.$id)

      if (result.success) {
        logger.log('TrackerErrorBoundary: Salvataggio emergenza riuscito!', {
          routeId: result.data.$id
        })
        this.setState({ 
          emergencySaved: true,
          savedRouteId: result.data.$id
        })
        
        // Pulisci localStorage
        localStorage.removeItem('active_tracking_temp')
      } else {
        throw new Error(result.error || 'Salvataggio fallito')
      }

    } catch (saveError) {
      logger.error('TrackerErrorBoundary: Errore durante salvataggio emergenza:', saveError)
      this.setState({ 
        emergencySaveError: saveError.message || 'Impossibile salvare i dati' 
      })
      
      // FALLBACK: Mantieni in localStorage
      logger.log('TrackerErrorBoundary: Dati rimangono in localStorage per recupero manuale')
      this.setState({ emergencySaved: 'localStorage' })
    }
  }

  // ==========================================
  // RESET ERROR: Torna alla home
  // ==========================================
  handleGoHome = () => {
    logger.log('TrackerErrorBoundary: Utente torna alla home dopo errore tracking')
    
    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      emergencySaved: false,
      emergencySaveError: null
    })

    // Naviga alla home (via callback)
    if (this.props.onGoHome) {
      this.props.onGoHome()
    }
  }

  // ==========================================
  // RENDER: Mostra fallback specifico tracking
  // ==========================================
  render() {
    if (this.state.hasError) {
      return <TrackerErrorFallback 
        emergencySaved={this.state.emergencySaved}
        emergencySaveError={this.state.emergencySaveError}
        error={this.state.error}
        onGoHome={this.handleGoHome}
      />
    }

    return this.props.children
  }
}

// ==========================================
// TRACKER ERROR FALLBACK UI
// FIX: Modale full-screen sempre visibile
// ==========================================
const TrackerErrorFallback = ({ emergencySaved, emergencySaveError, error, onGoHome }) => {
  const isDev = import.meta.env.DEV

  return (
    // FIX: modal-overlay per full-screen
    <div className="modal-overlay">
      <div 
        className="modal-content max-w-md"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: `2px solid ${emergencySaved ? 'var(--status-warning)' : 'var(--status-error)'}`
        }}
      >
        {/* Icona */}
        <div className="flex justify-center mb-6">
          <div 
            className="rounded-full p-4"
            style={{ 
              backgroundColor: emergencySaved ? 'var(--status-warning)' : 'var(--status-error)' 
            }}
          >
            {emergencySaved ? (
              <FaSave className="text-white text-5xl" aria-hidden="true" />
            ) : (
              <FaExclamationCircle className="text-white text-5xl" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Titolo */}
        <h1 
          className="text-2xl font-bold text-center mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          {emergencySaved ? '⚠️ Errore nel Tracking' : '❌ Errore Critico'}
        </h1>

        {/* Messaggio principale */}
        <div 
          className="rounded-lg p-4 mb-6"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: `1px solid ${emergencySaved ? 'var(--status-warning)' : 'var(--status-error)'}`
          }}
        >
          {emergencySaved === true && (
            <>
              <p 
                className="text-center font-semibold mb-2"
                style={{ color: 'var(--status-success)' }}
              >
                ✅ I tuoi dati GPS sono stati salvati!
              </p>
              <p 
                className="text-sm text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                Il percorso è stato salvato automaticamente su Appwrite. 
                Puoi recuperarlo dalla sezione "Percorsi Salvati".
              </p>
            </>
          )}
          
          {emergencySaved === 'localStorage' && (
            <>
              <p 
                className="text-center font-semibold mb-2"
                style={{ color: 'var(--status-warning)' }}
              >
                ⚠️ Dati salvati localmente
              </p>
              <p 
                className="text-sm text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                Non è stato possibile salvare su cloud, ma i dati sono in memoria locale.
                Riprova più tardi a sincronizzare.
              </p>
            </>
          )}

          {!emergencySaved && emergencySaveError && (
            <>
              <p 
                className="text-center font-semibold mb-2"
                style={{ color: 'var(--status-error)' }}
              >
                ❌ Salvataggio fallito
              </p>
              <p 
                className="text-sm text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                {emergencySaveError}
              </p>
            </>
          )}

          {!emergencySaved && !emergencySaveError && (
            <p 
              className="text-center"
              style={{ color: 'var(--text-secondary)' }}
            >
              Si è verificato un errore durante il tracking GPS.
            </p>
          )}
        </div>

        {/* Dettagli errore (solo dev) */}
        {isDev && error && (
          <div 
            className="mb-6 p-3 rounded-lg text-xs overflow-auto max-h-40"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)'
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Errore tecnico:</strong>
            <pre className="mt-1 whitespace-pre-wrap break-words">
              {error.toString()}
            </pre>
          </div>
        )}

        {/* Bottone Home */}
        <button
          onClick={onGoHome}
          className="btn-primary w-full"
          style={{
            backgroundColor: 'var(--color-orange)',
            color: 'var(--text-on-gradient)'
          }}
        >
          Torna alla Home
        </button>

        {/* Footer info */}
        <p 
          className="text-xs text-center mt-4"
          style={{ color: 'var(--text-muted)' }}
        >
          {emergencySaved 
            ? 'I tuoi dati sono al sicuro 🛡️' 
            : 'Contatta il supporto se il problema persiste'}
        </p>
      </div>
    </div>
  )
}

export default TrackerErrorBoundary