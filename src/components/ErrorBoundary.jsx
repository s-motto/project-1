// ==========================================
// ERROR BOUNDARY COMPONENT
// ==========================================
// Error Boundary principale per catturare errori React non gestiti
// 
// Funzionalità:
// - Cattura errori in qualsiasi componente child
// - Log automatico tramite logger.js
// - Mostra UI di fallback user-friendly
// - Possibilità di reset per riprovare
// - Supporto dark mode tramite CSS variables
// 
// Uso:
// <ErrorBoundary>
//   <App />
// </ErrorBoundary>
// ==========================================

import React from 'react'
import logger from '../utils/logger'
import ErrorFallback from './ErrorFallback'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  // ==========================================
  // LIFECYCLE: Aggiorna state quando si verifica un errore
  // ==========================================
  static getDerivedStateFromError(error) {
    // Aggiorna lo state così il prossimo render mostrerà la UI di fallback
    return { hasError: true }
  }

  // ==========================================
  // LIFECYCLE: Log errore quando catturato
  // ==========================================
  componentDidCatch(error, errorInfo) {
    // Log dell'errore con il nostro logger
    logger.error('ErrorBoundary catturato errore:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    })

    // Salva error info nello state per mostrare dettagli in dev mode
    this.setState({
      error,
      errorInfo
    })

    // In produzione, potremmo inviare l'errore a un servizio di monitoring
    // come Sentry o simili
    if (import.meta.env.PROD && this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  // ==========================================
  // RESET ERROR: Permette di riprovare
  // ==========================================
  resetErrorBoundary = () => {
    logger.log('ErrorBoundary: Reset richiesto dall\'utente')
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })

    // Callback opzionale per reset aggiuntivo (es. clear cache)
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  // ==========================================
  // RENDER: Mostra fallback o children
  // ==========================================
  render() {
    if (this.state.hasError) {
      // Mostra UI di fallback personalizzata
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetErrorBoundary={this.resetErrorBoundary}
          showHome={this.props.showHome !== false} // default true
        />
      )
    }

    // Nessun errore, renderizza i children normalmente
    return this.props.children
  }
}

export default ErrorBoundary