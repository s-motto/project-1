// ==========================================
// TEST PER USEGPSTRACKING HOOK
// ==========================================
// Test del custom hook per tracking GPS:
// - Gestione state (position, trackPoints, distance, elevation, heading)
// - handlePositionUpdate: calcolo distanza, elevazione, bearing
// - Filtro punti troppo vicini
// - GPS accuracy e waiting for fix
// - Gestione tracking/pausa flags
// - Gestione errori GPS
// ==========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useGPSTracking from '../useGPSTracking'

// Mock calculateDistance
vi.mock('../../utils/gpsUtils', () => ({
  calculateDistance: vi.fn((lat1, lon1, lat2, lon2) => {
    // Mock semplice: distanza = 0.01 km (10 metri) tra punti
    return 0.01
  })
}))

// ==========================================
// HELPER: Crea posizione GPS mock
// ==========================================

function createMockPosition({
  latitude = 44.1,
  longitude = 9.5,
  altitude = 100,
  accuracy = 10,
  timestamp = Date.now()
} = {}) {
  return {
    coords: {
      latitude,
      longitude,
      altitude,
      accuracy
    },
    timestamp
  }
}

// ==========================================
// SETUP
// ==========================================

let mockToast
let mockIsTrackingRef
let mockIsPausedRef

beforeEach(() => {
  vi.clearAllMocks()
  
  mockToast = {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn()
  }

  mockIsTrackingRef = { current: false }
  mockIsPausedRef = { current: false }
})

// ==========================================
// TEST INIZIALIZZAZIONE
// ==========================================

describe('useGPSTracking - Inizializzazione', () => {
  it('inizializza con state vuoto', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    expect(result.current.currentPosition).toBeNull()
    expect(result.current.trackPoints).toEqual([])
    expect(result.current.distance).toBe(0)
    expect(result.current.elevationGain).toBe(0)
    expect(result.current.elevationLoss).toBe(0)
    expect(result.current.heading).toBe(0)
    expect(result.current.gpsAccuracy).toBeNull()
    expect(result.current.waitingForGoodFix).toBe(false)
  })

  it('espone handlePositionUpdate', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    expect(result.current.handlePositionUpdate).toBeDefined()
    expect(typeof result.current.handlePositionUpdate).toBe('function')
  })

  it('espone handlePositionError', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    expect(result.current.handlePositionError).toBeDefined()
    expect(typeof result.current.handlePositionError).toBe('function')
  })
})

// ==========================================
// TEST HANDLE POSITION UPDATE - BASE
// ==========================================

describe('useGPSTracking - handlePositionUpdate base', () => {
  it('aggiorna currentPosition', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition({ latitude: 44.1, longitude: 9.5 })

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.currentPosition).toEqual({
      lat: 44.1,
      lng: 9.5,
      altitude: 100,
      timestamp: position.timestamp,
      accuracy: 10
    })
  })

  it('aggiorna gpsAccuracy', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition({ accuracy: 25 })

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.gpsAccuracy).toBe(25)
  })

  it('non aggiunge trackPoints se non tracking', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition()

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.trackPoints).toEqual([])
  })

  it('non aggiunge trackPoints se in pausa', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = true

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: true,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition()

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.trackPoints).toEqual([])
  })
})

// ==========================================
// TEST GPS ACCURACY E WAITING FOR FIX
// ==========================================

describe('useGPSTracking - GPS accuracy', () => {
  it('setta waitingForGoodFix false se accuracy <= 150m (default)', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition({ accuracy: 100 })

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.waitingForGoodFix).toBe(false)
  })

  it('setta waitingForGoodFix false se accuracy esattamente 150m', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition({ accuracy: 150 })

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.waitingForGoodFix).toBe(false)
  })

  it('usa gpsAccuracyMax custom dalle settings', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: { gpsAccuracyMax: 50 },
      toast: mockToast
    }))

    const position = createMockPosition({ accuracy: 40 })

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.waitingForGoodFix).toBe(false)
  })

  it('non cambia waitingForGoodFix se accuracy troppo bassa', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: { gpsAccuracyMax: 50 },
      toast: mockToast
    }))

    // Accuracy peggiore del threshold
    const position = createMockPosition({ accuracy: 200 })

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    // waitingForGoodFix rimane false (stato iniziale)
    expect(result.current.waitingForGoodFix).toBe(false)
  })
})

// ==========================================
// TEST TRACKING - PRIMO PUNTO
// ==========================================

describe('useGPSTracking - Primo punto tracking', () => {
  it('aggiunge primo punto a trackPoints quando tracking attivo', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition()

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.trackPoints).toHaveLength(1)
    expect(result.current.trackPoints[0]).toEqual({
      lat: 44.1,
      lng: 9.5,
      altitude: 100,
      timestamp: position.timestamp,
      accuracy: 10
    })
  })

  it('primo punto non incrementa distance', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition()

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.distance).toBe(0)
  })

  it('primo punto non calcola heading', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition()

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.heading).toBe(0)
  })
})

// ==========================================
// TEST TRACKING - SECONDO PUNTO E DISTANZA
// ==========================================

describe('useGPSTracking - Calcolo distanza', () => {
  it('aggiunge secondo punto se supera distanza minima', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: { minPointDistanceMeters: 3 },
      toast: mockToast
    }))

    // Primo punto
    const pos1 = createMockPosition({ latitude: 44.1, longitude: 9.5 })
    act(() => {
      result.current.handlePositionUpdate(pos1)
    })

    // Secondo punto (mock distanza = 0.01 km = 10m > 3m)
    const pos2 = createMockPosition({ latitude: 44.11, longitude: 9.51 })
    act(() => {
      result.current.handlePositionUpdate(pos2)
    })

    expect(result.current.trackPoints).toHaveLength(2)
  })

  it('incrementa distance quando aggiunge secondo punto', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    // Primo punto
    const pos1 = createMockPosition({ latitude: 44.1, longitude: 9.5 })
    act(() => {
      result.current.handlePositionUpdate(pos1)
    })

    // Secondo punto
    const pos2 = createMockPosition({ latitude: 44.11, longitude: 9.51 })
    act(() => {
      result.current.handlePositionUpdate(pos2)
    })

    // Mock calculateDistance ritorna 0.01 km
    expect(result.current.distance).toBe(0.01)
  })

  it('non aggiunge punto se distanza < minPointDistanceMeters', async () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    // Mock calculateDistance per ritornare 0.001 km (1 metro)
    const { calculateDistance } = await import('../../utils/gpsUtils')
    calculateDistance.mockReturnValueOnce(0.001)

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: { minPointDistanceMeters: 3 }, // Richiede 3m = 0.003km
      toast: mockToast
    }))

    // Primo punto
    const pos1 = createMockPosition({ latitude: 44.1, longitude: 9.5 })
    act(() => {
      result.current.handlePositionUpdate(pos1)
    })

    // Secondo punto troppo vicino (1m < 3m)
    const pos2 = createMockPosition({ latitude: 44.1001, longitude: 9.5001 })
    act(() => {
      result.current.handlePositionUpdate(pos2)
    })

    expect(result.current.trackPoints).toHaveLength(1) // Solo primo punto
    expect(result.current.distance).toBe(0) // Distance non incrementata
  })

  it('usa minPointDistanceMeters default 3m se non specificato', async () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    // Mock per distanza piccola
    const { calculateDistance } = await import('../../utils/gpsUtils')
    calculateDistance.mockReturnValueOnce(0.002) // 2 metri < 3m default

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {}, // No minPointDistanceMeters
      toast: mockToast
    }))

    const pos1 = createMockPosition()
    act(() => {
      result.current.handlePositionUpdate(pos1)
    })

    const pos2 = createMockPosition({ latitude: 44.1001, longitude: 9.5001 })
    act(() => {
      result.current.handlePositionUpdate(pos2)
    })

    expect(result.current.trackPoints).toHaveLength(1) // Punto filtrato
  })
})

// ==========================================
// TEST ELEVAZIONE
// ==========================================

describe('useGPSTracking - Calcolo elevazione', () => {
  it('calcola elevationGain per salita', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    // Primo punto a 100m
    const pos1 = createMockPosition({ altitude: 100 })
    act(() => {
      result.current.handlePositionUpdate(pos1)
    })

    // Secondo punto a 120m (salita +20m)
    const pos2 = createMockPosition({ latitude: 44.11, altitude: 120 })
    act(() => {
      result.current.handlePositionUpdate(pos2)
    })

    expect(result.current.elevationGain).toBe(20)
    expect(result.current.elevationLoss).toBe(0)
  })

  it('calcola elevationLoss per discesa', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    // Primo punto a 100m
    const pos1 = createMockPosition({ altitude: 100 })
    act(() => {
      result.current.handlePositionUpdate(pos1)
    })

    // Secondo punto a 80m (discesa -20m)
    const pos2 = createMockPosition({ latitude: 44.11, altitude: 80 })
    act(() => {
      result.current.handlePositionUpdate(pos2)
    })

    expect(result.current.elevationGain).toBe(0)
    expect(result.current.elevationLoss).toBe(20)
  })

  it('accumula elevationGain su multiple salite', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    // Punto 1: 100m
    act(() => {
      result.current.handlePositionUpdate(createMockPosition({ altitude: 100 }))
    })

    // Punto 2: 120m (+20m)
    act(() => {
      result.current.handlePositionUpdate(createMockPosition({ 
        latitude: 44.11, altitude: 120 
      }))
    })

    // Punto 3: 150m (+30m)
    act(() => {
      result.current.handlePositionUpdate(createMockPosition({ 
        latitude: 44.12, altitude: 150 
      }))
    })

    expect(result.current.elevationGain).toBe(50) // 20 + 30
  })

  it('non calcola elevazione se altitude null', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const pos1 = createMockPosition({ altitude: null })
    act(() => {
      result.current.handlePositionUpdate(pos1)
    })

    const pos2 = createMockPosition({ latitude: 44.11, altitude: null })
    act(() => {
      result.current.handlePositionUpdate(pos2)
    })

    expect(result.current.elevationGain).toBe(0)
    expect(result.current.elevationLoss).toBe(0)
  })

  it('gestisce salita e discesa mista', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    // 100m → 120m → 110m → 140m
    act(() => {
      result.current.handlePositionUpdate(createMockPosition({ altitude: 100 }))
    })
    act(() => {
      result.current.handlePositionUpdate(createMockPosition({ 
        latitude: 44.11, altitude: 120 
      }))
    })
    act(() => {
      result.current.handlePositionUpdate(createMockPosition({ 
        latitude: 44.12, altitude: 110 
      }))
    })
    act(() => {
      result.current.handlePositionUpdate(createMockPosition({ 
        latitude: 44.13, altitude: 140 
      }))
    })

    expect(result.current.elevationGain).toBe(50) // +20 +30
    expect(result.current.elevationLoss).toBe(10) // -10
  })
})

// ==========================================
// TEST HEADING/BEARING
// ==========================================

describe('useGPSTracking - Calcolo heading', () => {
  it('calcola heading per secondo punto', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    // Primo punto
    const pos1 = createMockPosition({ latitude: 44.1, longitude: 9.5 })
    act(() => {
      result.current.handlePositionUpdate(pos1)
    })

    // Secondo punto
    const pos2 = createMockPosition({ latitude: 44.11, longitude: 9.51 })
    act(() => {
      result.current.handlePositionUpdate(pos2)
    })

    // Heading dovrebbe essere calcolato (0-360 gradi)
    expect(result.current.heading).toBeGreaterThanOrEqual(0)
    expect(result.current.heading).toBeLessThan(360)
  })

  it('heading è numero valido', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const pos1 = createMockPosition({ latitude: 44.1, longitude: 9.5 })
    const pos2 = createMockPosition({ latitude: 44.11, longitude: 9.51 })

    act(() => {
      result.current.handlePositionUpdate(pos1)
    })
    act(() => {
      result.current.handlePositionUpdate(pos2)
    })

    expect(typeof result.current.heading).toBe('number')
    expect(isNaN(result.current.heading)).toBe(false)
  })

  it('non calcola heading se in pausa', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const pos1 = createMockPosition({ latitude: 44.1, longitude: 9.5 })
    act(() => {
      result.current.handlePositionUpdate(pos1)
    })

    // Metti in pausa
    mockIsPausedRef.current = true

    const pos2 = createMockPosition({ latitude: 44.11, longitude: 9.51 })
    act(() => {
      result.current.handlePositionUpdate(pos2)
    })

    // Heading non dovrebbe cambiare da 0
    expect(result.current.heading).toBe(0)
  })
})

// ==========================================
// TEST HANDLE POSITION ERROR
// ==========================================

describe('useGPSTracking - handlePositionError', () => {
  it('gestisce errore code 1 (permesso negato)', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const error = { code: 1, message: 'Permission denied' }

    act(() => {
      result.current.handlePositionError(error)
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Errore GPS: Abilita il GPS nelle impostazioni del browser.'
    )
  })

  it('gestisce errore code 2 (posizione non disponibile)', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const error = { code: 2, message: 'Position unavailable' }

    act(() => {
      result.current.handlePositionError(error)
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Errore GPS: Posizione non disponibile. Sei all\'aperto?'
    )
  })

  it('gestisce errore code 3 (timeout)', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const error = { code: 3, message: 'Timeout' }

    act(() => {
      result.current.handlePositionError(error)
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Errore GPS: Timeout. Il GPS impiega troppo tempo.'
    )
  })

  it('gestisce errore generico', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const error = { code: 99, message: 'Unknown error' }

    act(() => {
      result.current.handlePositionError(error)
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Errore GPS: Unknown error'
    )
  })
})

// ==========================================
// TEST EDGE CASES
// ==========================================

describe('useGPSTracking - Edge cases', () => {
  it('gestisce multiple posizioni in rapida successione', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    // Aggiungi 5 posizioni
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.handlePositionUpdate(
          createMockPosition({ 
            latitude: 44.1 + i * 0.01,
            longitude: 9.5 + i * 0.01
          })
        )
      })
    }

    expect(result.current.trackPoints.length).toBeGreaterThan(0)
    expect(result.current.distance).toBeGreaterThan(0)
  })

  it('gestisce accuracy molto alta (buon segnale)', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition({ accuracy: 5 })

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.gpsAccuracy).toBe(5)
    expect(result.current.waitingForGoodFix).toBe(false)
  })

  it('gestisce accuracy molto bassa (pessimo segnale)', () => {
    const { result } = renderHook(() => useGPSTracking({
      isTracking: false,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition({ accuracy: 500 })

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.gpsAccuracy).toBe(500)
  })

  it('gestisce altitude negativa (sotto livello del mare)', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    act(() => {
      result.current.handlePositionUpdate(createMockPosition({ altitude: -10 }))
    })
    act(() => {
      result.current.handlePositionUpdate(createMockPosition({ 
        latitude: 44.11, altitude: 10 
      }))
    })

    expect(result.current.elevationGain).toBe(20) // -10 → 10
  })

  it('gestisce coordinate ai poli', () => {
    mockIsTrackingRef.current = true
    mockIsPausedRef.current = false

    const { result } = renderHook(() => useGPSTracking({
      isTracking: true,
      isPaused: false,
      isTrackingRef: mockIsTrackingRef,
      isPausedRef: mockIsPausedRef,
      settings: {},
      toast: mockToast
    }))

    const position = createMockPosition({ latitude: 89.9, longitude: 0 })

    act(() => {
      result.current.handlePositionUpdate(position)
    })

    expect(result.current.currentPosition).toBeDefined()
    expect(result.current.currentPosition.lat).toBe(89.9)
  })
})