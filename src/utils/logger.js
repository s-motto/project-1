/**
 * Logger utility that only logs in development mode
 * Prevents console statements from appearing in production builds
 */

const isDevelopment = import.meta.env.DEV

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  
  error: (...args) => {
    if (isDevelopment) {
      console.error(...args)
    }
    // In production, you could send errors to a logging service here
    // e.g., Sentry, LogRocket, etc.
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args)
    }
  }
}

export default logger

