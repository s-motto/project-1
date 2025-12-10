// ==========================================
// TEST PER LOGGER.JS
// ==========================================
// Test del logger utility:
// - Development mode: tutti i log con timestamp
// - Production mode: solo error e warn (senza timestamp)
// - Gestione argomenti multipli
// - Export corretti
// ==========================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ==========================================
// SETUP E HELPERS
// ==========================================

// Helper per verificare che il primo argomento sia un prefisso valido
const expectValidPrefix = (call, level, withTimestamp = true) => {
  const prefix = call[0]
  if (withTimestamp) {
    // In development: [timestamp] [LEVEL]
    expect(prefix).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[.*\]$/)
    expect(prefix).toContain(`[${level.toUpperCase()}]`)
  } else {
    // In production: [LEVEL]
    expect(prefix).toBe(`[${level.toUpperCase()}]`)
  }
}

// Helper per verificare gli argomenti dopo il prefisso
const expectArgs = (call, ...expectedArgs) => {
  const actualArgs = call.slice(1) // Rimuovi il prefisso
  expect(actualArgs).toEqual(expectedArgs)
}

// ==========================================
// TEST DEVELOPMENT MODE
// ==========================================

describe('logger - Development mode', () => {
  let consoleLogSpy
  let consoleErrorSpy
  let consoleWarnSpy
  let consoleInfoSpy
  let consoleDebugSpy
  let logger

  beforeEach(async () => {
    // Reset moduli per ogni test
    vi.resetModules()
    
    // Mock import.meta.env.DEV = true
    vi.stubEnv('DEV', true)
    
    // Spy sulle funzioni console
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    
    // Import fresh del logger
    const module = await import('../../utils/logger')
    logger = module.default
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('log() chiama console.log con prefisso e messaggio', () => {
    logger.log('test message')

    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    const call = consoleLogSpy.mock.calls[0]
    expectValidPrefix(call, 'log', true)
    expectArgs(call, 'test message')
  })

  it('error() chiama console.error con prefisso e messaggio', () => {
    logger.error('error message')

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const call = consoleErrorSpy.mock.calls[0]
    expectValidPrefix(call, 'error', true)
    expectArgs(call, 'error message')
  })

  it('warn() chiama console.warn con prefisso e messaggio', () => {
    logger.warn('warning message')

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    const call = consoleWarnSpy.mock.calls[0]
    expectValidPrefix(call, 'warn', true)
    expectArgs(call, 'warning message')
  })

  it('info() chiama console.info con prefisso e messaggio', () => {
    logger.info('info message')

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
    const call = consoleInfoSpy.mock.calls[0]
    expectValidPrefix(call, 'info', true)
    expectArgs(call, 'info message')
  })

  it('log() passa multiple arguments', () => {
    logger.log('message', 123, true, null)

    const call = consoleLogSpy.mock.calls[0]
    expectValidPrefix(call, 'log', true)
    expectArgs(call, 'message', 123, true, null)
  })

  it('error() passa multiple arguments', () => {
    logger.error('Error:', { code: 500 }, 'details')

    const call = consoleErrorSpy.mock.calls[0]
    expectValidPrefix(call, 'error', true)
    expectArgs(call, 'Error:', { code: 500 }, 'details')
  })

  it('warn() passa multiple arguments', () => {
    logger.warn('Warning:', [1, 2, 3])

    const call = consoleWarnSpy.mock.calls[0]
    expectValidPrefix(call, 'warn', true)
    expectArgs(call, 'Warning:', [1, 2, 3])
  })

  it('info() passa multiple arguments', () => {
    logger.info('Info:', 'value1', 'value2')

    const call = consoleInfoSpy.mock.calls[0]
    expectValidPrefix(call, 'info', true)
    expectArgs(call, 'Info:', 'value1', 'value2')
  })

  it('gestisce oggetti complessi', () => {
    const complexObject = {
      data: [1, 2, 3],
      nested: { a: 'b' }
    }
    
    logger.log('Complex:', complexObject)

    const call = consoleLogSpy.mock.calls[0]
    expectArgs(call, 'Complex:', complexObject)
  })

  it('gestisce array', () => {
    const array = [1, 'two', { three: 3 }]
    
    logger.log('Array:', array)

    const call = consoleLogSpy.mock.calls[0]
    expectArgs(call, 'Array:', array)
  })

  it('gestisce stringhe vuote', () => {
    logger.log('')

    const call = consoleLogSpy.mock.calls[0]
    expectArgs(call, '')
  })

  it('gestisce undefined', () => {
    logger.log(undefined)

    const call = consoleLogSpy.mock.calls[0]
    expectArgs(call, undefined)
  })

  it('gestisce null', () => {
    logger.log(null)

    const call = consoleLogSpy.mock.calls[0]
    expectArgs(call, null)
  })

  it('gestisce numeri', () => {
    logger.log(123, 45.67, -89, 0)

    const call = consoleLogSpy.mock.calls[0]
    expectArgs(call, 123, 45.67, -89, 0)
  })

  it('gestisce boolean', () => {
    logger.log(true, false)

    const call = consoleLogSpy.mock.calls[0]
    expectArgs(call, true, false)
  })

  it('può essere chiamato più volte', () => {
    logger.log('first')
    logger.log('second')
    logger.log('third')

    expect(consoleLogSpy).toHaveBeenCalledTimes(3)
    expectArgs(consoleLogSpy.mock.calls[0], 'first')
    expectArgs(consoleLogSpy.mock.calls[1], 'second')
    expectArgs(consoleLogSpy.mock.calls[2], 'third')
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

  it('debug() chiama console.debug in development', () => {
    logger.debug('debug message')

    expect(consoleDebugSpy).toHaveBeenCalledTimes(1)
    const call = consoleDebugSpy.mock.calls[0]
    expectValidPrefix(call, 'debug', true)
    expectArgs(call, 'debug message')
  })
})

// ==========================================
// TEST PRODUCTION MODE
// ==========================================

describe('logger - Production mode', () => {
  let consoleLogSpy
  let consoleErrorSpy
  let consoleWarnSpy
  let consoleInfoSpy
  let consoleDebugSpy
  let logger

  beforeEach(async () => {
    vi.resetModules()
    
    // Mock import.meta.env.DEV = false (production)
    vi.stubEnv('DEV', false)
    
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    
    const module = await import('../../utils/logger')
    logger = module.default
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('log() NON chiama console.log in production', () => {
    logger.log('test message')

    expect(consoleLogSpy).not.toHaveBeenCalled()
  })

  it('info() NON chiama console.info in production', () => {
    logger.info('info message')

    expect(consoleInfoSpy).not.toHaveBeenCalled()
  })

  it('error() SEMPRE chiama console.error (anche in production)', () => {
    logger.error('error message')

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const call = consoleErrorSpy.mock.calls[0]
    // In production non c'è timestamp
    expectValidPrefix(call, 'error', false)
    expectArgs(call, 'error message')
  })

  it('warn() SEMPRE chiama console.warn (anche in production)', () => {
    logger.warn('warning message')

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    const call = consoleWarnSpy.mock.calls[0]
    expectValidPrefix(call, 'warn', false)
    expectArgs(call, 'warning message')
  })

  it('debug() NON chiama console.debug in production', () => {
    logger.debug('debug message')

    expect(consoleDebugSpy).not.toHaveBeenCalled()
  })

  it('solo error e warn loggano in production con multiple arguments', () => {
    logger.log('log', { key: 'value' })
    logger.info('info', { key: 'value' })
    logger.error('error', { key: 'value' })
    logger.warn('warn', { key: 'value' })

    expect(consoleLogSpy).not.toHaveBeenCalled()
    expect(consoleInfoSpy).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
  })

  it('error passa correttamente gli argomenti in production', () => {
    const errorObj = new Error('Something went wrong')
    logger.error('Operation failed:', errorObj)

    const call = consoleErrorSpy.mock.calls[0]
    expectValidPrefix(call, 'error', false)
    expectArgs(call, 'Operation failed:', errorObj)
  })
})

// ==========================================
// TEST EXPORT
// ==========================================

describe('logger - Export', () => {
  it('ha export default', async () => {
    const module = await import('../../utils/logger')
    
    expect(module.default).toBeDefined()
  })

  it('export default ha metodo log', async () => {
    const module = await import('../../utils/logger')
    
    expect(module.default.log).toBeDefined()
    expect(typeof module.default.log).toBe('function')
  })

  it('export default ha metodo error', async () => {
    const module = await import('../../utils/logger')
    
    expect(module.default.error).toBeDefined()
    expect(typeof module.default.error).toBe('function')
  })

  it('export default ha metodo warn', async () => {
    const module = await import('../../utils/logger')
    
    expect(module.default.warn).toBeDefined()
    expect(typeof module.default.warn).toBe('function')
  })

  it('export default ha metodo info', async () => {
    const module = await import('../../utils/logger')
    
    expect(module.default.info).toBeDefined()
    expect(typeof module.default.info).toBe('function')
  })

  it('export default ha metodo debug', async () => {
    const module = await import('../../utils/logger')
    
    expect(module.default.debug).toBeDefined()
    expect(typeof module.default.debug).toBe('function')
  })

  it('ha named export logger', async () => {
    const { logger } = await import('../../utils/logger')
    
    expect(logger).toBeDefined()
  })

  it('default export e named export sono lo stesso oggetto', async () => {
    const module = await import('../../utils/logger')
    
    expect(module.default).toBe(module.logger)
  })

  it('tutti i metodi sono funzioni', async () => {
    const { logger } = await import('../../utils/logger')
    
    expect(typeof logger.log).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.group).toBe('function')
    expect(typeof logger.structured).toBe('function')
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
    vi.resetModules()
    vi.stubEnv('DEV', true)
    
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    
    const module = await import('../../utils/logger')
    logger = module.default
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('scenario realistico: log di operazione con esito', () => {
    const operation = 'fetchUserData'
    const result = { success: true, userId: 123 }
    
    logger.log(`${operation} completed:`, result)

    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    expectArgs(consoleLogSpy.mock.calls[0], `${operation} completed:`, result)
  })

  it('scenario realistico: log di errore con stack trace', () => {
    const error = new Error('Something went wrong')
    
    logger.error('Operation failed:', error)

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expectArgs(consoleErrorSpy.mock.calls[0], 'Operation failed:', error)
  })

  it('scenario realistico: log strutturato', () => {
    const logData = {
      level: 'info',
      message: 'User action',
      userId: 123,
      action: 'click',
      target: 'button#submit',
      timestamp: Date.now()
    }
    
    logger.info('User event:', logData)

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
    expectArgs(consoleInfoSpy.mock.calls[0], 'User event:', logData)
  })

  it('scenario realistico: debug di stato componente', () => {
    const componentState = {
      isLoading: false,
      data: [1, 2, 3],
      error: null
    }
    
    logger.log('Component state:', componentState)

    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    expectArgs(consoleLogSpy.mock.calls[0], 'Component state:', componentState)
  })

  it('prefisso contiene timestamp ISO valido in development', () => {
    logger.log('test')

    const prefix = consoleLogSpy.mock.calls[0][0]
    // Estrai il timestamp dal prefisso
    const match = prefix.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/)
    
    expect(match).not.toBeNull()
    // Verifica che sia un timestamp valido
    const timestamp = new Date(match[1])
    expect(timestamp.getTime()).not.toBeNaN()
  })
})

// ==========================================
// TEST METODI AVANZATI
// ==========================================

describe('logger - Metodi avanzati', () => {
  let consoleGroupSpy
  let consoleGroupEndSpy
  let consoleLogSpy
  let logger

  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('DEV', true)
    
    consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
    consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    const module = await import('../../utils/logger')
    logger = module.default
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('group() crea un gruppo di log in development', () => {
    logger.group('Test Group', () => {
      logger.log('inside group')
    })

    expect(consoleGroupSpy).toHaveBeenCalledWith('Test Group')
    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    expect(consoleGroupEndSpy).toHaveBeenCalledTimes(1)
  })

  it('group() NON viene eseguito in production', async () => {
    vi.resetModules()
    vi.stubEnv('DEV', false)
    
    const module = await import('../../utils/logger')
    const prodLogger = module.default
    
    let fnCalled = false
    prodLogger.group('Test Group', () => {
      fnCalled = true
    })

    expect(consoleGroupSpy).not.toHaveBeenCalled()
    expect(fnCalled).toBe(false)
  })

  it('structured() delega al metodo corretto', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    logger.structured('error', 'Test error', { code: 500 })

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    
    consoleErrorSpy.mockRestore()
  })
})