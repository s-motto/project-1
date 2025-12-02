// ==========================================
// LOGGER UTILITY
// ==========================================
// Utility per il logging con diversi livelli di severità
// - In sviluppo: tutti i log vengono mostrati in console
// - In produzione: solo errori e warning critici
// - Predisposto per integrazione con servizi esterni (Sentry, LogRocket, etc.)
// ==========================================

const isDevelopment = import.meta.env.DEV

// ==========================================
// CONFIGURAZIONE
// ==========================================

// Livelli di log abilitati in produzione
const PRODUCTION_LOG_LEVELS = {
  error: true,   // Errori sempre loggati
  warn: true,    // Warning critici loggati
  info: false,   // Info disabilitato in prod
  log: false     // Log generico disabilitato in prod
}

// ==========================================
// SERVIZI ESTERNI (placeholder per future integrazioni)
// ==========================================

/**
 * Invia errore a servizio di monitoraggio esterno
 * Decommentare e configurare quando si integra Sentry/LogRocket/etc.
 * 
 * @param {Error|string} error - Errore da inviare
 * @param {Object} context - Contesto aggiuntivo
 */
const sendToExternalService = (error, context = {}) => {
  // ==========================================
  // SENTRY INTEGRATION (esempio)
  // ==========================================
  // import * as Sentry from '@sentry/react'
  // 
  // if (error instanceof Error) {
  //   Sentry.captureException(error, { extra: context })
  // } else {
  //   Sentry.captureMessage(error, { extra: context })
  // }

  // ==========================================
  // LOGROCKET INTEGRATION (esempio)
  // ==========================================
  // import LogRocket from 'logrocket'
  // 
  // if (error instanceof Error) {
  //   LogRocket.captureException(error, { extra: context })
  // } else {
  //   LogRocket.log(error, context)
  // }

  // Per ora non fa nulla - attivare quando si integra un servizio
}

// ==========================================
// FORMATTAZIONE
// ==========================================

/**
 * Formatta il timestamp per i log
 * @returns {string} Timestamp formattato
 */
const getTimestamp = () => {
  return new Date().toISOString()
}

/**
 * Crea prefisso per i log con timestamp e livello
 * @param {string} level - Livello del log
 * @returns {string} Prefisso formattato
 */
const getPrefix = (level) => {
  if (isDevelopment) {
    return `[${getTimestamp()}] [${level.toUpperCase()}]`
  }
  return `[${level.toUpperCase()}]`
}

// ==========================================
// LOGGER PRINCIPALE
// ==========================================

export const logger = {
  /**
   * Log generico - solo in sviluppo
   */
  log: (...args) => {
    if (isDevelopment || PRODUCTION_LOG_LEVELS.log) {
      console.log(getPrefix('log'), ...args)
    }
  },
  
  /**
   * Log informativo - solo in sviluppo
   */
  info: (...args) => {
    if (isDevelopment || PRODUCTION_LOG_LEVELS.info) {
      console.info(getPrefix('info'), ...args)
    }
  },
  
  /**
   * Warning - loggato anche in produzione
   */
  warn: (...args) => {
    if (isDevelopment || PRODUCTION_LOG_LEVELS.warn) {
      console.warn(getPrefix('warn'), ...args)
    }
  },
  
  /**
   * Errore - SEMPRE loggato, anche in produzione
   * Invia anche a servizi esterni se configurati
   */
  error: (...args) => {
    // Gli errori vengono SEMPRE loggati
    console.error(getPrefix('error'), ...args)
    
    // In produzione, invia a servizi di monitoraggio
    if (!isDevelopment) {
      // Estrai l'errore e il contesto dagli argomenti
      const error = args[0]
      const context = args.length > 1 ? { details: args.slice(1) } : {}
      
      sendToExternalService(error, context)
    }
  },

  /**
   * Log di debug - solo in sviluppo, per informazioni dettagliate
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(getPrefix('debug'), ...args)
    }
  },

  /**
   * Log di un gruppo di messaggi correlati
   * Utile per debugging complesso
   */
  group: (label, fn) => {
    if (isDevelopment) {
      console.group(label)
      fn()
      console.groupEnd()
    }
  },

  /**
   * Log con contesto strutturato
   * Utile per logging più dettagliato
   * 
   * @param {string} level - Livello del log
   * @param {string} message - Messaggio principale  
   * @param {Object} context - Dati strutturati aggiuntivi
   */
  structured: (level, message, context = {}) => {
    const logEntry = {
      timestamp: getTimestamp(),
      level,
      message,
      ...context
    }

    switch (level) {
      case 'error':
        logger.error(message, context)
        break
      case 'warn':
        logger.warn(message, context)
        break
      case 'info':
        logger.info(message, context)
        break
      default:
        logger.log(message, context)
    }
  }
}

export default logger