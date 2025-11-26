// ==========================================
// TEST PER ROUTECALCULATIONSERVICE.JS
// ==========================================
// Test del servizio di calcolo percorsi:
// - calculateRoute: percorso tra 2 punti
// - calculateRouteWithWaypoints: percorso con waypoint
// ==========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculateRoute, calculateRouteWithWaypoints } from '../routeCalculationService'

// ==========================================
// MOCK DI APPWRITE PROXY
// ==========================================

vi.mock('../appwriteProxy', () => ({
  callORS: vi.fn()
}))

import { callORS } from '../appwriteProxy'

// ==========================================
// HELPER: Mock risposta ORS
// ==========================================

function createMockORSResponse({
  distance = 5.5,
  duration = 3600, // secondi
  ascent = 150,
  descent = 100,
  coordinates = [[9.19, 45.46], [9.20, 45.47]],
  steps = []
} = {}) {
  return {
    features: [
      {
        geometry: {
          coordinates: coordinates
        },
        properties: {
          summary: {
            distance: distance,
            duration: duration
          },
          ascent: ascent,
          descent: descent,
          segments: [
            {
              steps: steps
            }
          ]
        }
      }
    ]
  }
}

// ==========================================
// TEST CALCULATE ROUTE
// ==========================================

describe('calculateRoute - Calcolo percorso base', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calcola percorso con successo', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('chiama callORS con parametri corretti', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    await calculateRoute({ start, end, language: 'it', units: 'km' })

    expect(callORS).toHaveBeenCalledWith('v2/directions/foot-hiking/geojson', {
      coordinates: [[9.19, 45.46], [9.20, 45.47]],
      instructions: true,
      language: 'it',
      units: 'km',
      elevation: true
    })
  })

  it('usa language e units di default', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    await calculateRoute({ start, end })

    expect(callORS).toHaveBeenCalledWith('v2/directions/foot-hiking/geojson',
      expect.objectContaining({
        language: 'it',
        units: 'km'
      })
    )
  })

  it('include startPoint e endPoint nei dati', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.startPoint).toEqual(start)
    expect(result.data.endPoint).toEqual(end)
  })

  it('estrae distance correttamente', async () => {
    const mockResponse = createMockORSResponse({ distance: 7.85 })
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.distance).toBe(7.85)
  })

  it('arrotonda distance a 2 decimali', async () => {
    const mockResponse = createMockORSResponse({ distance: 7.8567 })
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.distance).toBe(7.86)
  })

  it('converte duration da secondi a minuti', async () => {
    const mockResponse = createMockORSResponse({ duration: 3600 }) // 1 ora
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.duration).toBe(60) // 60 minuti
  })

  it('arrotonda duration a numero intero', async () => {
    const mockResponse = createMockORSResponse({ duration: 1830 }) // 30.5 minuti
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.duration).toBe(31) // Arrotondato
  })

  it('arrotonda ascent a numero intero', async () => {
    const mockResponse = createMockORSResponse({ ascent: 234.7 })
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.ascent).toBe(235)
  })

  it('usa 0 per ascent se undefined', async () => {
    const response = {
      features: [{
        geometry: { coordinates: [[9.19, 45.46], [9.20, 45.47]] },
        properties: {
          summary: { distance: 5.5, duration: 3600 },
          segments: [{ steps: [] }]
        }
      }]
    }
    callORS.mockResolvedValue(response)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.ascent).toBe(0)
  })

  it('arrotonda descent a numero intero', async () => {
    const mockResponse = createMockORSResponse({ descent: 187.3 })
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.descent).toBe(187)
  })

  it('usa 0 per descent se undefined', async () => {
    const response = {
      features: [{
        geometry: { coordinates: [[9.19, 45.46], [9.20, 45.47]] },
        properties: {
          summary: { distance: 5.5, duration: 3600 },
          segments: [{ steps: [] }]
        }
      }]
    }
    callORS.mockResolvedValue(response)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.descent).toBe(0)
  })

  it('include coordinate nel risultato', async () => {
    const coords = [[9.19, 45.46], [9.195, 45.465], [9.20, 45.47]]
    const mockResponse = createMockORSResponse({ coordinates: coords })
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.coordinates).toEqual(coords)
  })

  it('estrae instructions dai steps', async () => {
    const steps = [
      { instruction: 'Svolta a destra', distance: 100 },
      { instruction: 'Continua dritto', distance: 200 }
    ]
    const mockResponse = createMockORSResponse({ steps })
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.instructions).toEqual(steps)
  })

  it('usa array vuoto per instructions se segments undefined', async () => {
    const response = {
      features: [{
        geometry: { coordinates: [[9.19, 45.46], [9.20, 45.47]] },
        properties: {
          summary: { distance: 5.5, duration: 3600 }
        }
      }]
    }
    callORS.mockResolvedValue(response)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.instructions).toEqual([])
  })

  it('include geojson completo', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.data.geojson).toEqual(mockResponse.features[0])
  })

  it('restituisce errore se nessun percorso trovato', async () => {
    const mockResponse = { features: [] }
    callORS.mockResolvedValue(mockResponse)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('gestisce errore API', async () => {
    callORS.mockRejectedValue(new Error('Network error'))

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })

  it('gestisce errore generico con messaggio di fallback', async () => {
    callORS.mockRejectedValue(new Error())

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result = await calculateRoute({ start, end })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Errore nel calcolo del percorso')
  })
})

// ==========================================
// TEST CALCULATE ROUTE WITH WAYPOINTS
// ==========================================

describe('calculateRouteWithWaypoints - Percorso con waypoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calcola percorso con 2 punti (start + end)', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const points = [
      { lat: 45.46, lon: 9.19, name: 'Milano' },
      { lat: 45.47, lon: 9.20, name: 'Monza' }
    ]

    const result = await calculateRouteWithWaypoints({ points })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('calcola percorso con 3 punti (start + waypoint + end)', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const points = [
      { lat: 45.46, lon: 9.19, name: 'Milano' },
      { lat: 45.465, lon: 9.195, name: 'Waypoint 1' },
      { lat: 45.47, lon: 9.20, name: 'Monza' }
    ]

    const result = await calculateRouteWithWaypoints({ points })

    expect(result.success).toBe(true)
  })

  it('mappa correttamente le coordinate dei punti', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const points = [
      { lat: 45.46, lon: 9.19, name: 'P1' },
      { lat: 45.465, lon: 9.195, name: 'P2' },
      { lat: 45.47, lon: 9.20, name: 'P3' }
    ]

    await calculateRouteWithWaypoints({ points })

    expect(callORS).toHaveBeenCalledWith('v2/directions/foot-hiking/geojson',
      expect.objectContaining({
        coordinates: [
          [9.19, 45.46],
          [9.195, 45.465],
          [9.20, 45.47]
        ]
      })
    )
  })

  it('include startPoint e endPoint nei dati', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const points = [
      { lat: 45.46, lon: 9.19, name: 'Milano' },
      { lat: 45.465, lon: 9.195, name: 'Waypoint' },
      { lat: 45.47, lon: 9.20, name: 'Monza' }
    ]

    const result = await calculateRouteWithWaypoints({ points })

    expect(result.data.startPoint).toEqual(points[0])
    expect(result.data.endPoint).toEqual(points[2])
  })

  it('estrae waypoints intermedi correttamente', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const points = [
      { lat: 45.46, lon: 9.19, name: 'Start' },
      { lat: 45.461, lon: 9.191, name: 'WP1' },
      { lat: 45.465, lon: 9.195, name: 'WP2' },
      { lat: 45.47, lon: 9.20, name: 'End' }
    ]

    const result = await calculateRouteWithWaypoints({ points })

    expect(result.data.waypoints).toEqual([
      { lat: 45.461, lon: 9.191, name: 'WP1' },
      { lat: 45.465, lon: 9.195, name: 'WP2' }
    ])
  })

  it('waypoints è array vuoto con solo 2 punti', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const points = [
      { lat: 45.46, lon: 9.19, name: 'Start' },
      { lat: 45.47, lon: 9.20, name: 'End' }
    ]

    const result = await calculateRouteWithWaypoints({ points })

    expect(result.data.waypoints).toEqual([])
  })

  it('estrae tutti i dati del percorso', async () => {
    const mockResponse = createMockORSResponse({
      distance: 10.5,
      duration: 7200,
      ascent: 300,
      descent: 250
    })
    callORS.mockResolvedValue(mockResponse)

    const points = [
      { lat: 45.46, lon: 9.19, name: 'Start' },
      { lat: 45.47, lon: 9.20, name: 'End' }
    ]

    const result = await calculateRouteWithWaypoints({ points })

    expect(result.data.distance).toBe(10.5)
    expect(result.data.duration).toBe(120) // minuti
    expect(result.data.ascent).toBe(300)
    expect(result.data.descent).toBe(250)
  })

  it('restituisce errore con meno di 2 punti', async () => {
    const points = [{ lat: 45.46, lon: 9.19, name: 'Solo punto' }]

    const result = await calculateRouteWithWaypoints({ points })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Servono almeno 2 punti per calcolare un percorso')
    expect(callORS).not.toHaveBeenCalled()
  })

  it('restituisce errore con points null', async () => {
    const result = await calculateRouteWithWaypoints({ points: null })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Servono almeno 2 punti per calcolare un percorso')
  })

  it('restituisce errore con points undefined', async () => {
    const result = await calculateRouteWithWaypoints({})

    expect(result.success).toBe(false)
    expect(result.error).toBe('Servono almeno 2 punti per calcolare un percorso')
  })

  it('restituisce errore con array vuoto', async () => {
    const result = await calculateRouteWithWaypoints({ points: [] })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Servono almeno 2 punti per calcolare un percorso')
  })

  it('gestisce errore API', async () => {
    callORS.mockRejectedValue(new Error('API Error'))

    const points = [
      { lat: 45.46, lon: 9.19, name: 'Start' },
      { lat: 45.47, lon: 9.20, name: 'End' }
    ]

    const result = await calculateRouteWithWaypoints({ points })

    expect(result.success).toBe(false)
    expect(result.error).toBe('API Error')
  })

  it('gestisce errore generico con messaggio di fallback', async () => {
    callORS.mockRejectedValue(new Error())

    const points = [
      { lat: 45.46, lon: 9.19, name: 'Start' },
      { lat: 45.47, lon: 9.20, name: 'End' }
    ]

    const result = await calculateRouteWithWaypoints({ points })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Errore nel calcolo del percorso con waypoint')
  })

  it('usa language e units di default', async () => {
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValue(mockResponse)

    const points = [
      { lat: 45.46, lon: 9.19, name: 'Start' },
      { lat: 45.47, lon: 9.20, name: 'End' }
    ]

    await calculateRouteWithWaypoints({ points })

    expect(callORS).toHaveBeenCalledWith('v2/directions/foot-hiking/geojson',
      expect.objectContaining({
        language: 'it',
        units: 'km'
      })
    )
  })

  it('restituisce errore se nessun percorso trovato', async () => {
    const mockResponse = { features: [] }
    callORS.mockResolvedValue(mockResponse)

    const points = [
      { lat: 45.46, lon: 9.19, name: 'Start' },
      { lat: 45.47, lon: 9.20, name: 'End' }
    ]

    const result = await calculateRouteWithWaypoints({ points })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ==========================================
// TEST EXPORT
// ==========================================

describe('routeCalculationService - Export', () => {
  it('ha export default con tutte le funzioni', async () => {
    const service = await import('../routeCalculationService')
    
    expect(service.default).toBeDefined()
    expect(service.default.calculateRoute).toBeDefined()
    expect(service.default.calculateRouteWithWaypoints).toBeDefined()
  })

  it('ha named export per calculateRoute', async () => {
    const { calculateRoute } = await import('../routeCalculationService')
    
    expect(calculateRoute).toBeDefined()
    expect(typeof calculateRoute).toBe('function')
  })

  it('ha named export per calculateRouteWithWaypoints', async () => {
    const { calculateRouteWithWaypoints } = await import('../routeCalculationService')
    
    expect(calculateRouteWithWaypoints).toBeDefined()
    expect(typeof calculateRouteWithWaypoints).toBe('function')
  })
})

// ==========================================
// TEST INTEGRAZIONE
// ==========================================

describe('routeCalculationService - Test integrazione', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('workflow completo: calcola percorso base poi con waypoint', async () => {
    // Prima calcola percorso base
    const mockResponse1 = createMockORSResponse({ distance: 5.0 })
    callORS.mockResolvedValueOnce(mockResponse1)

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result1 = await calculateRoute({ start, end })

    expect(result1.success).toBe(true)
    expect(result1.data.distance).toBe(5.0)

    // Poi calcola con waypoint
    const mockResponse2 = createMockORSResponse({ distance: 6.5 })
    callORS.mockResolvedValueOnce(mockResponse2)

    const points = [
      start,
      { lat: 45.465, lon: 9.195, name: 'Waypoint' },
      end
    ]

    const result2 = await calculateRouteWithWaypoints({ points })

    expect(result2.success).toBe(true)
    expect(result2.data.distance).toBe(6.5)
    expect(result2.data.waypoints).toHaveLength(1)
  })

  it('gestisce errori in sequenza con retry', async () => {
    // Prima chiamata fallisce
    callORS.mockRejectedValueOnce(new Error('Network error'))

    const start = { lat: 45.46, lon: 9.19, name: 'Milano' }
    const end = { lat: 45.47, lon: 9.20, name: 'Monza' }

    const result1 = await calculateRoute({ start, end })
    expect(result1.success).toBe(false)

    // Seconda chiamata ha successo
    const mockResponse = createMockORSResponse()
    callORS.mockResolvedValueOnce(mockResponse)

    const result2 = await calculateRoute({ start, end })
    expect(result2.success).toBe(true)
  })
})