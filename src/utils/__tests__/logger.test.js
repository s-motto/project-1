// ==========================================
// TEST PER LOGGER.JS
// ==========================================
// Test dell'utility di logging:
// - Logging in development mode
// - Silenzioso in production mode
// - Passaggio argomenti
// - Multiple arguments
// - Export default e named
// ==========================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ==========================================
// SETUP MOCK ENVIRONMENT
// ==========================================

// Mock di import.meta.env
const originalEnv = import.meta.env.DEV

// Helper per impostare environment mode
function setDevelopmentMode(isDev) {
  // @ts-ignore - Stiamo mocckando per i test
  import.meta.env.DEV = isDev
}

// ==========================================
// TEST LOGGER IN DEVELOPMENT MODE
// ==========================================

describe('logger - Development mode', () => {
  let consoleLogSpy
  let consoleErrorSpy
  let consoleWarnSpy
  let consoleInfoSpy
  let logger

  beforeEach(async () => {
    // Imposta development mode
    setDevelopmentMode(true)

    // Spy sui metodi console
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    // Clear module cache e re-import per applicare nuovo env
    vi.resetModules()
    const loggerModule = await import('../logger.js')
    logger = loggerModule.default
  })

  afterEach(() => {
    // Restore spies
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()

    // Restore environment
    setDevelopmentMode(originalEnv)
  })

  it('log() chiama console.log in development', () => {
    logger.log('test message')
    
    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    expect(consoleLogSpy).toHaveBeenCalledWith('test message')
  })

  it('error() chiama console.error in development', () => {
    logger.error('error message')
    
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith('error message')
  })

  it('warn() chiama console.warn in development', () => {
    logger.warn('warning message')
    
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    expect(consoleWarnSpy).toHaveBeenCalledWith('warning message')
  })

  it('info() chiama console.info in development', () => {
    logger.info('info message')
    
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
    expect(consoleInfoSpy).toHaveBeenCalledWith('info message')
  })

  it('log() passa multiple arguments', () => {
    logger.log('message', 123, true, null)
    
    expect(consoleLogSpy).toHaveBeenCalledWith('message', 123, true, null)
  })

  it('error() passa multiple arguments', () => {
    logger.error('Error:', { code: 500 }, 'details')
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', { code: 500 }, 'details')
  })

  it('warn() passa multiple arguments', () => {
    logger.warn('Warning:', [1, 2, 3])
    
    expect(consoleWarnSpy).toHaveBeenCalledWith('Warning:', [1, 2, 3])
  })

  it('info() passa multiple arguments', () => {
    logger.info('Info:', 'value1', 'value2')
    
    expect(consoleInfoSpy).toHaveBeenCalledWith('Info:', 'value1', 'value2')
  })

  it('gestisce oggetti complessi', () => {
    const complexObject = {
      user: { id: 1, name: 'Test' },
      data: [1, 2, 3],
      nested: { deep: { value: true } }
    }
    
    logger.log('Complex:', complexObject)
    
    expect(consoleLogSpy).toHaveBeenCalledWith('Complex:', complexObject)
  })

  it('gestisce array', () => {
    const array = [1, 'two', { three: 3 }, [4, 5]]
    
    logger.log('Array:', array)
    
    expect(consoleLogSpy).toHaveBeenCalledWith('Array:', array)
  })

  it('gestisce stringhe vuote', () => {
    logger.log('')
    
    expect(consoleLogSpy).toHaveBeenCalledWith('')
  })

  it('gestisce undefined', () => {
    logger.log(undefined)
    
    expect(consoleLogSpy).toHaveBeenCalledWith(undefined)
  })

  it('gestisce null', () => {
    logger.log(null)
    
    expect(consoleLogSpy).toHaveBeenCalledWith(null)
  })

  it('gestisce numeri', () => {
    logger.log(123, 45.67, -89, 0)
    
    expect(consoleLogSpy).toHaveBeenCalledWith(123, 45.67, -89, 0)
  })

  it('gestisce boolean', () => {
    logger.log(true, false)
    
    expect(consoleLogSpy).toHaveBeenCalledWith(true, false)
  })

  it('può essere chiamato più volte', () => {
    logger.log('first')
    logger.log('second')
    logger.log('third')
    
    expect(consoleLogSpy).toHaveBeenCalledTimes(3)
    expect(consoleLogSpy).toHaveBeenNthCalledWith(1, 'first')
    expect(consoleLogSpy).toHaveBeenNthCalledWith(2, 'second')
    expect(consoleLogSpy).toHaveBeenNthCalledWith(3, 'third')
  })

  it('metodi diversi possono essere chiamati insieme', () => {
    logger.log('log message')
    logger.error('error message')
    logger.warn('warn message')
    logger.info('info message')
    
    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
  })
})

// ==========================================
// TEST LOGGER IN PRODUCTION MODE
// ==========================================

describe('logger - Production mode', () => {
  let consoleLogSpy
  let consoleErrorSpy
  let consoleWarnSpy
  let consoleInfoSpy
  let logger

  beforeEach(async () => {
    // Imposta production mode
    setDevelopmentMode(false)

    // Spy sui metodi console
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    // Clear module cache e re-import per applicare nuovo env
    vi.resetModules()
    const loggerModule = await import('../logger.js')
    logger = loggerModule.default
  })

  afterEach(() => {
    // Restore spies
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()

    // Restore environment
    setDevelopmentMode(originalEnv)
  })

  it('log() NON chiama console.log in production', () => {
    logger.log('test message')
    
    expect(consoleLogSpy).not.toHaveBeenCalled()
  })

  it('error() NON chiama console.error in production', () => {
    logger.error('error message')
    
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('warn() NON chiama console.warn in production', () => {
    logger.warn('warning message')
    
    expect(consoleWarnSpy).not.toHaveBeenCalled()
  })

  it('info() NON chiama console.info in production', () => {
    logger.info('info message')
    
    expect(consoleInfoSpy).not.toHaveBeenCalled()
  })

  it('nessun metodo logga in production anche con multiple arguments', () => {
    logger.log('log', 1, 2, 3)
    logger.error('error', { key: 'value' })
    logger.warn('warn', [1, 2, 3])
    logger.info('info', true, false)
    
    expect(consoleLogSpy).not.toHaveBeenCalled()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(consoleWarnSpy).not.toHaveBeenCalled()
    expect(consoleInfoSpy).not.toHaveBeenCalled()
  })

  it('chiamate multiple non loggano in production', () => {
    logger.log('first')
    logger.log('second')
    logger.error('error')
    logger.warn('warning')
    logger.info('info')
    
    expect(consoleLogSpy).not.toHaveBeenCalled()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(consoleWarnSpy).not.toHaveBeenCalled()
    expect(consoleInfoSpy).not.toHaveBeenCalled()
  })
})

// ==========================================
// TEST EXPORT
// ==========================================

describe('logger - Export', () => {
  it('ha export default', async () => {
    const loggerModule = await import('../logger.js')
    
    expect(loggerModule.default).toBeDefined()
    expect(typeof loggerModule.default).toBe('object')
  })

  it('export default ha metodo log', async () => {
    const loggerModule = await import('../logger.js')
    
    expect(typeof loggerModule.default.log).toBe('function')
  })

  it('export default ha metodo error', async () => {
    const loggerModule = await import('../logger.js')
    
    expect(typeof loggerModule.default.error).toBe('function')
  })

  it('export default ha metodo warn', async () => {
    const loggerModule = await import('../logger.js')
    
    expect(typeof loggerModule.default.warn).toBe('function')
  })

  it('export default ha metodo info', async () => {
    const loggerModule = await import('../logger.js')
    
    expect(typeof loggerModule.default.info).toBe('function')
  })

  it('ha named export logger', async () => {
    const loggerModule = await import('../logger.js')
    
    expect(loggerModule.logger).toBeDefined()
    expect(typeof loggerModule.logger).toBe('object')
  })

  it('default export e named export sono lo stesso oggetto', async () => {
    const loggerModule = await import('../logger.js')
    
    expect(loggerModule.default).toBe(loggerModule.logger)
  })

  it('tutti i metodi sono funzioni', async () => {
    const loggerModule = await import('../logger.js')
    const logger = loggerModule.default
    
    expect(typeof logger.log).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.info).toBe('function')
  })
})

// ==========================================
// TEST INTEGRAZIONE
// ==========================================

describe('logger - Test integrazione', () => {
  let consoleLogSpy
  let consoleErrorSpy
  let consoleInfoSpy
  let logger

  beforeEach(async () => {
    setDevelopmentMode(true)
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    vi.resetModules()
    const loggerModule = await import('../logger.js')
    logger = loggerModule.default
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleInfoSpy.mockRestore()
    setDevelopmentMode(originalEnv)
  })

  it('scenario realistico: log di operazione con esito', () => {
    logger.log('Starting operation...')
    logger.log('Operation completed:', { success: true, duration: 150 })
    
    expect(consoleLogSpy).toHaveBeenCalledTimes(2)
  })

  it('scenario realistico: log di errore con stack trace', () => {
    const error = new Error('Something went wrong')
    logger.error('Operation failed:', error)
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('Operation failed:', error)
  })

  it('scenario realistico: log strutturato', () => {
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'User action',
      userId: 123,
      action: 'click',
      target: 'button'
    }
    
    logger.info('User event:', logData)
    
    expect(consoleInfoSpy).toHaveBeenCalledWith('User event:', logData)
  })

  it('scenario realistico: debug di stato componente', () => {
    const componentState = {
      isLoading: false,
      data: [1, 2, 3],
      error: null,
      user: { id: 1, name: 'Test' }
    }
    
    logger.log('Component state:', componentState)
    
    expect(consoleLogSpy).toHaveBeenCalledWith('Component state:', componentState)
  })
})