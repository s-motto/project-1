// ==========================================
// TEST PER USEWAYPOINTMANAGER HOOK
// ==========================================
// Test del custom hook per gestione waypoints:
// - Aggiunta/rimozione waypoints
// - Preview percorso con OpenRouteService
// - Ricalcolo percorso completo
// - Normalizzazione coordinate
// - Formatters distanza e durata
// - Validazioni (tracking, max waypoints)
// ==========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import useWaypointManager from '../useWaypointManager'

// ==========================================
// MOCK EXTERNAL DEPENDENCIES
// ==========================================

// Mock callORS
vi.mock('../../services/appwriteProxy', () => ({
  callORS: vi.fn()
}))

// Mock reverseGeocode
vi.mock('../../services/geocodingService', () => ({
  reverseGeocode: vi.fn()
}))

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

// Import dopo i mock
import { callORS } from '../../services/appwriteProxy'
import { reverseGeocode } from '../../services/geocodingService'

// ==========================================
// HELPER: Mock dati
// ==========================================

const mockRoute = {
  startPoint: { lat: 44.1, lon: 9.5 },
  endPoint: { lat: 44.2, lon: 9.6 },
  coordinates: [[44.1, 9.5], [44.15, 9.55], [44.2, 9.6]],
  distance: 10,
  duration: 120,
  ascent: 200,
  descent: 180
}

const mockCurrentPosition = {
  lat: 44.12,
  lng: 9.52
}

function createMockORSResponse({
  distance = 12,
  duration = 3600,
  ascent = 250,
  descent = 200,
  coordinates = [[9.5, 44.1], [9.55, 44.15], [9.6, 44.2]]
} = {}) {
  return {
    features: [{
      geometry: {
        coordinates: coordinates
      },
      properties: {
        summary: {
          distance: distance,
          duration: duration
        },
        ascent: ascent,
        descent: descent
      }
    }]
  }
}

// ==========================================
// SETUP
// ==========================================

let mockToast
let originalConfirm

beforeEach(() => {
  vi.clearAllMocks()

  mockToast = {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }

  // Mock window.confirm
  originalConfirm = global.confirm
  global.confirm = vi.fn()

  // Setup default mocks
  callORS.mockResolvedValue(createMockORSResponse())
  reverseGeocode.mockResolvedValue('Località Test')
})

afterEach(() => {
  global.confirm = originalConfirm
})

// ==========================================
// TEST INIZIALIZZAZIONE
// ==========================================

describe('useWaypointManager - Inizializzazione', () => {
  it('inizializza con state vuoto', () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: {}
    }))

    expect(result.current.waypoints).toEqual([])
    expect(result.current.tempWaypoint).toBeNull()
    expect(result.current.showWaypointDialog).toBe(false)
    expect(result.current.waypointPreview).toBeNull()
    expect(result.current.loadingPreview).toBe(false)
    expect(result.current.recalculatingRoute).toBe(false)
    expect(result.current.showWaypointsList).toBe(false)
  })

  it('normalizza route con coordinate GeoJSON', () => {
    const routeGeoJSON = {
      ...mockRoute,
      coordinates: [[9.5, 44.1], [9.55, 44.15]] // [lon, lat] format
    }

    const { result } = renderHook(() => useWaypointManager({
      route: routeGeoJSON,
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: {}
    }))

    // currentRouteData dovrebbe essere normalizzato a Leaflet format [lat, lon]
    expect(result.current.currentRouteData.coordinates[0]).toEqual([44.1, 9.5])
  })

  it('non normalizza route già in formato Leaflet', () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute, // Già [lat, lon]
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: {}
    }))

    expect(result.current.currentRouteData.coordinates[0]).toEqual([44.1, 9.5])
  })

  it('espone tutte le funzioni handler', () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: {}
    }))

    expect(typeof result.current.handleMapLongPress).toBe('function')
    expect(typeof result.current.handleConfirmWaypoint).toBe('function')
    expect(typeof result.current.handleCancelWaypoint).toBe('function')
    expect(typeof result.current.handleRemoveWaypoint).toBe('function')
    expect(typeof result.current.formatPreviewDistance).toBe('function')
    expect(typeof result.current.formatPreviewDuration).toBe('function')
  })
})

// ==========================================
// TEST HANDLE MAP LONG PRESS
// ==========================================

describe('useWaypointManager - handleMapLongPress', () => {
  it('mostra toast se tracking non attivo', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: false, // Non tracking
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    expect(mockToast.info).toHaveBeenCalledWith('Avvia il tracking per aggiungere waypoints')
    expect(result.current.showWaypointDialog).toBe(false)
  })

  it('mostra toast se già 5 waypoints', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    // Aggiungi 5 waypoints manualmente
    act(() => {
      result.current.waypoints.push(
        { lat: 44.11, lng: 9.51, name: 'WP1' },
        { lat: 44.12, lng: 9.52, name: 'WP2' },
        { lat: 44.13, lng: 9.53, name: 'WP3' },
        { lat: 44.14, lng: 9.54, name: 'WP4' },
        { lat: 44.15, lng: 9.55, name: 'WP5' }
      )
    })

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.16, lng: 9.56 })
    })

    expect(mockToast.warning).toHaveBeenCalledWith('Massimo 5 waypoints consentiti')
  })

  it('crea tempWaypoint e mostra dialog', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      expect(result.current.tempWaypoint).toEqual({ lat: 44.15, lng: 9.55 })
      expect(result.current.showWaypointDialog).toBe(true)
    })
  })

  it('chiama calculateWaypointPreview', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      expect(callORS).toHaveBeenCalled()
      expect(reverseGeocode).toHaveBeenCalledWith(44.15, 9.55)
    })
  })

  it('setta loadingPreview durante il calcolo', async () => {
    // Mock con delay
    callORS.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(createMockORSResponse()), 100)))

    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    act(() => {
      result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    // Durante il calcolo
    await waitFor(() => {
      expect(result.current.loadingPreview).toBe(true)
    })

    // Dopo il calcolo
    await waitFor(() => {
      expect(result.current.loadingPreview).toBe(false)
    }, { timeout: 500 })
  })

  it('usa currentPosition se disponibile come start', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: mockCurrentPosition,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      const call = callORS.mock.calls[0]
      const coords = call[1].coordinates
      // Primo punto dovrebbe essere currentPosition
      expect(coords[0]).toEqual([mockCurrentPosition.lng, mockCurrentPosition.lat])
    })
  })
})

// ==========================================
// TEST CALCULATE WAYPOINT PREVIEW
// ==========================================

describe('useWaypointManager - calculateWaypointPreview', () => {
  it('costruisce coordinate array corretto', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: mockCurrentPosition,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      const call = callORS.mock.calls[0]
      const coords = call[1].coordinates

      // [start, newWaypoint, end]
      expect(coords).toHaveLength(3)
      expect(coords[0]).toEqual([mockCurrentPosition.lng, mockCurrentPosition.lat])
      expect(coords[1]).toEqual([9.55, 44.15]) // newWaypoint
      expect(coords[2]).toEqual([mockRoute.endPoint.lon, mockRoute.endPoint.lat])
    })
  })

  it('setta waypointPreview con dati ORS', async () => {
    const mockORS = createMockORSResponse({
      distance: 15,
      duration: 4500,
      ascent: 300,
      descent: 250
    })
    callORS.mockResolvedValue(mockORS)
    reverseGeocode.mockResolvedValue('Monte Test')

    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      expect(result.current.waypointPreview).toBeDefined()
      expect(result.current.waypointPreview.distance).toBe(15)
      expect(result.current.waypointPreview.duration).toBe(4500)
      expect(result.current.waypointPreview.name).toBe('Monte Test')
      expect(result.current.waypointPreview.ascent).toBe(300)
      expect(result.current.waypointPreview.descent).toBe(250)
    })
  })

  it('gestisce errore API con toast', async () => {
    callORS.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Errore nel calcolo del percorso')
      expect(result.current.loadingPreview).toBe(false)
    })
  })
})

// ==========================================
// TEST HANDLE CONFIRM WAYPOINT
// ==========================================

describe('useWaypointManager - handleConfirmWaypoint', () => {
  it('aggiunge waypoint confermato alla lista', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    // Setup: crea preview
    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      expect(result.current.waypointPreview).toBeDefined()
    })

    // Conferma
    await act(async () => {
      await result.current.handleConfirmWaypoint()
    })

    expect(result.current.waypoints).toHaveLength(1)
    expect(result.current.waypoints[0].lat).toBe(44.15)
    expect(result.current.waypoints[0].lng).toBe(9.55)
    expect(result.current.waypoints[0].name).toBe('Località Test')
  })

  it('chiude dialog dopo conferma', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      expect(result.current.showWaypointDialog).toBe(true)
    })

    await act(async () => {
      await result.current.handleConfirmWaypoint()
    })

    expect(result.current.showWaypointDialog).toBe(false)
    expect(result.current.tempWaypoint).toBeNull()
    expect(result.current.waypointPreview).toBeNull()
  })

  it('aggiorna currentRouteData con dati preview', async () => {
    const mockORS = createMockORSResponse({
      distance: 15,
      duration: 4500,
      coordinates: [[9.5, 44.1], [9.55, 44.15], [9.6, 44.2]]
    })
    callORS.mockResolvedValue(mockORS)

    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      expect(result.current.waypointPreview).toBeDefined()
    })

    await act(async () => {
      await result.current.handleConfirmWaypoint()
    })

    expect(result.current.currentRouteData.distance).toBe(15)
    expect(result.current.currentRouteData.duration).toBe(75) // 4500/60
  })

  it('mostra toast success', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      expect(result.current.waypointPreview).toBeDefined()
    })

    await act(async () => {
      await result.current.handleConfirmWaypoint()
    })

    expect(mockToast.success).toHaveBeenCalledWith('Waypoint "Località Test" aggiunto!')
  })

  it('non fa nulla se tempWaypoint null', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleConfirmWaypoint()
    })

    expect(result.current.waypoints).toHaveLength(0)
    expect(mockToast.success).not.toHaveBeenCalled()
  })
})

// ==========================================
// TEST HANDLE CANCEL WAYPOINT
// ==========================================

describe('useWaypointManager - handleCancelWaypoint', () => {
  it('chiude dialog e pulisce state', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      expect(result.current.showWaypointDialog).toBe(true)
    })

    act(() => {
      result.current.handleCancelWaypoint()
    })

    expect(result.current.showWaypointDialog).toBe(false)
    expect(result.current.tempWaypoint).toBeNull()
    expect(result.current.waypointPreview).toBeNull()
  })

  it('non aggiunge waypoint alla lista', async () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    act(() => {
      result.current.handleCancelWaypoint()
    })

    expect(result.current.waypoints).toHaveLength(0)
  })
})

// ==========================================
// TEST HANDLE REMOVE WAYPOINT
// ==========================================

describe('useWaypointManager - handleRemoveWaypoint', () => {
  it('richiede conferma prima di rimuovere', async () => {
    global.confirm.mockReturnValue(false) // Annulla

    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    // Aggiungi waypoint
    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })
    await waitFor(() => expect(result.current.waypointPreview).toBeDefined())
    await act(async () => {
      await result.current.handleConfirmWaypoint()
    })

    // Prova a rimuovere (annulla)
    await act(async () => {
      await result.current.handleRemoveWaypoint(0)
    })

    expect(global.confirm).toHaveBeenCalled()
    expect(result.current.waypoints).toHaveLength(1) // Non rimosso
  })

  it('rimuove waypoint dopo conferma', async () => {
    global.confirm.mockReturnValue(true) // Conferma

    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    // Aggiungi waypoint
    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })
    await waitFor(() => expect(result.current.waypointPreview).toBeDefined())
    await act(async () => {
      await result.current.handleConfirmWaypoint()
    })

    // Rimuovi
    await act(async () => {
      await result.current.handleRemoveWaypoint(0)
    })

    expect(result.current.waypoints).toHaveLength(0)
    expect(mockToast.info).toHaveBeenCalledWith('Waypoint rimosso')
  })

  it('ripristina percorso originale se rimuove ultimo waypoint', async () => {
    global.confirm.mockReturnValue(true)

    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    // Aggiungi e rimuovi waypoint
    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })
    await waitFor(() => expect(result.current.waypointPreview).toBeDefined())
    await act(async () => {
      await result.current.handleConfirmWaypoint()
    })

    const originalDistance = result.current.currentRouteData.distance

    await act(async () => {
      await result.current.handleRemoveWaypoint(0)
    })

    expect(mockToast.info).toHaveBeenCalledWith('Percorso ripristinato')
    // Dovrebbe tornare al percorso originale
    expect(result.current.currentRouteData).toBeDefined()
  })
})

// ==========================================
// TEST FORMATTERS
// ==========================================

describe('useWaypointManager - formatPreviewDistance', () => {
  it('formatta km correttamente', () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: { distanceUnit: 'km' }
    }))

    const formatted = result.current.formatPreviewDistance(12.5)
    expect(formatted).toBe('12.50 km')
  })

  it('formatta miglia correttamente', () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: { distanceUnit: 'mi' }
    }))

    const formatted = result.current.formatPreviewDistance(10)
    expect(formatted).toContain('mi')
  })

  it('gestisce valore null', () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: {}
    }))

    const formatted = result.current.formatPreviewDistance(null)
    expect(formatted).toBe('---')
  })
})

describe('useWaypointManager - formatPreviewDuration', () => {
  it('formatta solo minuti', () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: {}
    }))

    const formatted = result.current.formatPreviewDuration(1800) // 30 min
    expect(formatted).toBe('30min')
  })

  it('formatta ore e minuti', () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: {}
    }))

    const formatted = result.current.formatPreviewDuration(7200) // 2h
    expect(formatted).toBe('2h 0min')
  })

  it('gestisce valore null', () => {
    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: {}
    }))

    const formatted = result.current.formatPreviewDuration(null)
    expect(formatted).toBe('---')
  })
})

// ==========================================
// TEST EDGE CASES
// ==========================================

describe('useWaypointManager - Edge cases', () => {
  it('gestisce route senza coordinates', () => {
    const emptyRoute = { ...mockRoute, coordinates: [] }

    const { result } = renderHook(() => useWaypointManager({
      route: emptyRoute,
      currentPosition: null,
      isTracking: false,
      toast: mockToast,
      settings: {}
    }))

    expect(result.current.currentRouteData).toBeDefined()
  })

  it('gestisce multiple waypoints in sequenza', async () => {
    global.confirm.mockReturnValue(true)

    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    // Aggiungi 3 waypoints
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.handleMapLongPress({ 
          lat: 44.15 + i * 0.01, 
          lng: 9.55 + i * 0.01 
        })
      })
      await waitFor(() => expect(result.current.waypointPreview).toBeDefined())
      await act(async () => {
        await result.current.handleConfirmWaypoint()
      })
    }

    expect(result.current.waypoints).toHaveLength(3)
  })

  it('gestisce reverseGeocode fallito', async () => {
    reverseGeocode.mockResolvedValue(null)

    const { result } = renderHook(() => useWaypointManager({
      route: mockRoute,
      currentPosition: null,
      isTracking: true,
      toast: mockToast,
      settings: {}
    }))

    await act(async () => {
      await result.current.handleMapLongPress({ lat: 44.15, lng: 9.55 })
    })

    await waitFor(() => {
      expect(result.current.waypointPreview).toBeDefined()
      // Name dovrebbe essere null se reverseGeocode fallisce
      expect(result.current.waypointPreview.name).toBeNull()
    })
  })
})