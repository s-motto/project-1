// Utility per il logging con diversi livelli di severità

const isDevelopment = import.meta.env.DEV // Controllo se siamo in ambiente di sviluppo

// Definizione dell'oggetto logger con vari metodi
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
    // In produzione potremmo inviare gli errori a un servizio di monitoraggio esterno
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

