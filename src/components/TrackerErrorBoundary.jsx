// ==========================================
// TRACKER ERROR BOUNDARY COMPONENT
// ==========================================
// Error Boundary specifico per il GPS tracking
// 
// Funzionalità critiche:
// - Cattura errori durante ActiveTracking
// - PRIMA del fallback → salva trackPoints su Appwrite
// - Salva dati come "emergenza" (status: 'emergency_save')
// - Mostra UI specifica: "Dati salvati in emergenza"
// - Permette di continuare a usare il resto dell'app
// 
// Uso:
// <TrackerErrorBoundary
//   user={user}
//   route={route}
//   trackingData={{ trackPoints, distance, elapsedTime, elevationGain, elevationLoss }}
// >
//   <ActiveTracking ... />
// </TrackerErrorBoundary>
// ==========================================

import React from 'react'
import { useNavigate } from 'react-router-dom'
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
  // ==========================================
  attemptEmergencySave = async () => {
    const { user, route, trackingData } = this.props

    // Verifica che abbiamo dati da salvare
    if (!trackingData || !trackingData.trackPoints || trackingData.trackPoints.length === 0) {
      logger.warn('TrackerErrorBoundary: Nessun trackPoint da salvare')
      this.setState({ emergencySaveError: 'Nessun dato GPS da salvare' })
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
        
        // Dati tracking effettivi (aggiunti come campi extra)
        actualDistance: parseFloat(trackingData.distance.toFixed(2)),
        actualDuration: Math.floor(trackingData.elapsedTime / 60), // minuti
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
      } else {
        throw new Error(result.error || 'Salvataggio fallito')
      }

    } catch (saveError) {
      logger.error('TrackerErrorBoundary: Errore durante salvataggio emergenza:', saveError)
      this.setState({ 
        emergencySaveError: saveError.message || 'Impossibile salvare i dati' 
      })
      
      // FALLBACK: Prova localStorage come ultima risorsa
      try {
        const localBackup = {
          timestamp: new Date().toISOString(),
          route: route.name,
          trackPoints: trackingData.trackPoints,
          distance: trackingData.distance,
          elapsedTime: trackingData.elapsedTime
        }
        localStorage.setItem('emergency_tracking_backup', JSON.stringify(localBackup))
        logger.log('TrackerErrorBoundary: Backup salvato in localStorage')
        this.setState({ emergencySaved: 'localStorage' })
      } catch (localError) {
        logger.error('TrackerErrorBoundary: Anche localStorage fallito:', localError)
      }
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
// ==========================================
const TrackerErrorFallback = ({ emergencySaved, emergencySaveError, error, onGoHome }) => {
  const isDev = import.meta.env.DEV

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div 
        className="card-container max-w-md w-full"
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
            backgroundColor: emergencySaved ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
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