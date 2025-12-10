// ==========================================
// TEST PER GEOCODINGSERVICE.JS
// ==========================================
// Test del servizio di geocoding:
// - geocodeText: testo → coordinate
// - fetchSuggestions: autocomplete
// - reverseGeocode: coordinate → nome
// ==========================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { geocodeText, fetchSuggestions, reverseGeocode } from '../../services/geocodingService'

// ==========================================
// MOCK DI APPWRITE PROXY
// ==========================================

vi.mock('../../services/appwriteProxy', () => ({
  callORS: vi.fn()
}))

import { callORS } from '../../services/appwriteProxy'

// ==========================================
// TEST GEOCODE TEXT
// ==========================================

describe('geocodeText - Geocodifica testo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('geocodifica testo con successo', async () => {
    const mockResponse = {
      features: [
        {
          geometry: {
            coordinates: [9.19, 45.4642] // [lon, lat]
          },
          properties: {
            label: 'Milano, Lombardia, Italia'
          }
        }
      ]
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await geocodeText('Milano')

    expect(callORS).toHaveBeenCalledWith('geocode/search', {
      text: 'Milano',
      'boundary.country': 'IT',
      size: '1'
    })

    expect(result).toEqual({
      lat: 45.4642,
      lon: 9.19,
      name: 'Milano, Lombardia, Italia'
    })
  })

  it('restituisce null se nessun risultato trovato', async () => {
    const mockResponse = {
      features: []
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await geocodeText('Luogo Inesistente')

    expect(result).toBeNull()
  })

  it('restituisce null se features è undefined', async () => {
    const mockResponse = {}

    callORS.mockResolvedValue(mockResponse)

    const result = await geocodeText('Test')

    expect(result).toBeNull()
  })

  it('restituisce null se text è null', async () => {
    const result = await geocodeText(null)

    expect(result).toBeNull()
    expect(callORS).not.toHaveBeenCalled()
  })

  it('restituisce null se text è undefined', async () => {
    const result = await geocodeText(undefined)

    expect(result).toBeNull()
    expect(callORS).not.toHaveBeenCalled()
  })

  it('restituisce null se text è stringa vuota', async () => {
    const result = await geocodeText('')

    expect(result).toBeNull()
    expect(callORS).not.toHaveBeenCalled()
  })

  it('gestisce errore API', async () => {
    callORS.mockRejectedValue(new Error('API Error'))

    const result = await geocodeText('Milano')

    expect(result).toBeNull()
  })

  it('geocodifica indirizzo completo', async () => {
    const mockResponse = {
      features: [
        {
          geometry: {
            coordinates: [12.4964, 41.9028]
          },
          properties: {
            label: 'Roma, Lazio, Italia'
          }
        }
      ]
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await geocodeText('Roma, Italia')

    expect(result).toEqual({
      lat: 41.9028,
      lon: 12.4964,
      name: 'Roma, Lazio, Italia'
    })
  })

  it('passa boundary.country=IT per limitare risultati in Italia', async () => {
    const mockResponse = {
      features: [{
        geometry: { coordinates: [9.19, 45.4642] },
        properties: { label: 'Milano' }
      }]
    }

    callORS.mockResolvedValue(mockResponse)

    await geocodeText('Milano')

    expect(callORS).toHaveBeenCalledWith('geocode/search', 
      expect.objectContaining({
        'boundary.country': 'IT'
      })
    )
  })

  it('richiede size=1 per ottenere solo il primo risultato', async () => {
    const mockResponse = {
      features: [{
        geometry: { coordinates: [9.19, 45.4642] },
        properties: { label: 'Milano' }
      }]
    }

    callORS.mockResolvedValue(mockResponse)

    await geocodeText('Milano')

    expect(callORS).toHaveBeenCalledWith('geocode/search', 
      expect.objectContaining({
        size: '1'
      })
    )
  })
})

// ==========================================
// TEST FETCH SUGGESTIONS
// ==========================================

describe('fetchSuggestions - Autocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('restituisce suggerimenti per testo valido', async () => {
    const mockResponse = {
      features: [
        {
          geometry: { coordinates: [9.19, 45.4642] },
          properties: { 
            label: 'Milano, Lombardia',
            id: 'place-1'
          }
        },
        {
          geometry: { coordinates: [9.2277, 45.4868] },
          properties: { 
            label: 'Monza, Lombardia',
            id: 'place-2'
          }
        }
      ]
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await fetchSuggestions('Mi')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      lat: 45.4642,
      lon: 9.19,
      display_name: 'Milano, Lombardia',
      place_id: 'place-1'
    })
    expect(result[1]).toEqual({
      lat: 45.4868,
      lon: 9.2277,
      display_name: 'Monza, Lombardia',
      place_id: 'place-2'
    })
  })

  it('restituisce array vuoto se text è troppo corto', async () => {
    const result = await fetchSuggestions('M')

    expect(result).toEqual([])
    expect(callORS).not.toHaveBeenCalled()
  })

  it('restituisce array vuoto se text è null', async () => {
    const result = await fetchSuggestions(null)

    expect(result).toEqual([])
    expect(callORS).not.toHaveBeenCalled()
  })

  it('restituisce array vuoto se text è undefined', async () => {
    const result = await fetchSuggestions(undefined)

    expect(result).toEqual([])
    expect(callORS).not.toHaveBeenCalled()
  })

  it('restituisce array vuoto se text è stringa vuota', async () => {
    const result = await fetchSuggestions('')

    expect(result).toEqual([])
    expect(callORS).not.toHaveBeenCalled()
  })

  it('usa maxResults di default (5)', async () => {
    const mockResponse = { features: [] }
    callORS.mockResolvedValue(mockResponse)

    await fetchSuggestions('Milano')

    expect(callORS).toHaveBeenCalledWith('geocode/search', 
      expect.objectContaining({
        size: '5'
      })
    )
  })

  it('usa maxResults personalizzato', async () => {
    const mockResponse = { features: [] }
    callORS.mockResolvedValue(mockResponse)

    await fetchSuggestions('Milano', 10)

    expect(callORS).toHaveBeenCalledWith('geocode/search', 
      expect.objectContaining({
        size: '10'
      })
    )
  })

  it('gestisce errore API', async () => {
    callORS.mockRejectedValue(new Error('API Error'))

    const result = await fetchSuggestions('Milano')

    expect(result).toEqual([])
  })

  it('mappa correttamente tutti i campi dei risultati', async () => {
    const mockResponse = {
      features: [
        {
          geometry: { coordinates: [12.4964, 41.9028] },
          properties: { 
            label: 'Roma, Lazio, Italia',
            id: 'roma-123'
          }
        }
      ]
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await fetchSuggestions('Roma')

    expect(result[0]).toEqual({
      lat: 41.9028,
      lon: 12.4964,
      display_name: 'Roma, Lazio, Italia',
      place_id: 'roma-123'
    })
  })

  it('passa boundary.country=IT', async () => {
    const mockResponse = { features: [] }
    callORS.mockResolvedValue(mockResponse)

    await fetchSuggestions('Milano')

    expect(callORS).toHaveBeenCalledWith('geocode/search', 
      expect.objectContaining({
        'boundary.country': 'IT'
      })
    )
  })

  it('gestisce risposta con features vuoto', async () => {
    const mockResponse = { features: [] }
    callORS.mockResolvedValue(mockResponse)

    const result = await fetchSuggestions('XXX')

    expect(result).toEqual([])
  })

  it('gestisce testo con caratteri speciali', async () => {
    const mockResponse = {
      features: [{
        geometry: { coordinates: [9.19, 45.4642] },
        properties: { label: "Sant'Angelo", id: 'place-1' }
      }]
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await fetchSuggestions("Sant'Angelo")

    expect(result).toHaveLength(1)
    expect(result[0].display_name).toBe("Sant'Angelo")
  })

  it('limita risultati a maxResults specificato', async () => {
    const mockResponse = {
      features: Array.from({ length: 3 }, (_, i) => ({
        geometry: { coordinates: [9.0 + i, 45.0 + i] },
        properties: { label: `Place ${i}`, id: `id-${i}` }
      }))
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await fetchSuggestions('Milano', 3)

    expect(result).toHaveLength(3)
  })
})

// ==========================================
// TEST REVERSE GEOCODE
// ==========================================

describe('reverseGeocode - Coordinate → Nome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('esegue reverse geocoding con successo', async () => {
    const mockResponse = {
      features: [
        {
          properties: {
            label: 'Milano, Lombardia, Italia'
          }
        }
      ]
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await reverseGeocode(45.4642, 9.19)

    expect(callORS).toHaveBeenCalledWith('geocode/reverse', {
      'point.lat': '45.4642',
      'point.lon': '9.19',
      size: '1'
    })

    expect(result).toBe('Milano, Lombardia, Italia')
  })

  it('usa properties.name se label non è disponibile', async () => {
    const mockResponse = {
      features: [
        {
          properties: {
            name: 'Milano'
          }
        }
      ]
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await reverseGeocode(45.4642, 9.19)

    expect(result).toBe('Milano')
  })

  it('restituisce fallback se label e name non disponibili', async () => {
    const mockResponse = {
      features: [
        {
          properties: {}
        }
      ]
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await reverseGeocode(45.4642, 9.19)

    expect(result).toBe('Località sconosciuta')
  })

  it('restituisce null se nessun risultato', async () => {
    const mockResponse = {
      features: []
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await reverseGeocode(45.4642, 9.19)

    expect(result).toBeNull()
  })

  it('restituisce null se features è undefined', async () => {
    const mockResponse = {}

    callORS.mockResolvedValue(mockResponse)

    const result = await reverseGeocode(45.4642, 9.19)

    expect(result).toBeNull()
  })

  it('gestisce errore API', async () => {
    callORS.mockRejectedValue(new Error('API Error'))

    const result = await reverseGeocode(45.4642, 9.19)

    expect(result).toBeNull()
  })

  it('converte coordinate in stringhe', async () => {
    const mockResponse = {
      features: [{ properties: { label: 'Test' } }]
    }

    callORS.mockResolvedValue(mockResponse)

    await reverseGeocode(45.4642, 9.19)

    expect(callORS).toHaveBeenCalledWith('geocode/reverse', 
      expect.objectContaining({
        'point.lat': '45.4642',
        'point.lon': '9.19'
      })
    )
  })

  it('gestisce coordinate negative', async () => {
    const mockResponse = {
      features: [{ properties: { label: 'Sydney, Australia' } }]
    }

    callORS.mockResolvedValue(mockResponse)

    const result = await reverseGeocode(-33.8688, 151.2093)

    expect(callORS).toHaveBeenCalledWith('geocode/reverse', {
      'point.lat': '-33.8688',
      'point.lon': '151.2093',
      size: '1'
    })

    expect(result).toBe('Sydney, Australia')
  })

  it('gestisce coordinate con molti decimali', async () => {
    const mockResponse = {
      features: [{ properties: { label: 'Test' } }]
    }

    callORS.mockResolvedValue(mockResponse)

    await reverseGeocode(45.46421234, 9.19001234)

    expect(callORS).toHaveBeenCalledWith('geocode/reverse', 
      expect.objectContaining({
        'point.lat': '45.46421234',
        'point.lon': '9.19001234'
      })
    )
  })

  it('richiede size=1 per ottenere solo il primo risultato', async () => {
    const mockResponse = {
      features: [{ properties: { label: 'Test' } }]
    }

    callORS.mockResolvedValue(mockResponse)

    await reverseGeocode(45.4642, 9.19)

    expect(callORS).toHaveBeenCalledWith('geocode/reverse', 
      expect.objectContaining({
        size: '1'
      })
    )
  })
})

// ==========================================
// TEST EXPORT
// ==========================================

describe('geocodingService - Export', () => {
  it('ha export default con tutte le funzioni', async () => {
    const geocodingService = await import('../../services/geocodingService')
    
    expect(geocodingService.default).toBeDefined()
    expect(geocodingService.default.geocodeText).toBeDefined()
    expect(geocodingService.default.fetchSuggestions).toBeDefined()
    expect(geocodingService.default.reverseGeocode).toBeDefined()
  })

  it('ha named export per geocodeText', async () => {
    const { geocodeText } = await import('../../services/geocodingService')
    
    expect(geocodeText).toBeDefined()
    expect(typeof geocodeText).toBe('function')
  })

  it('ha named export per fetchSuggestions', async () => {
    const { fetchSuggestions } = await import('../../services/geocodingService')
    
    expect(fetchSuggestions).toBeDefined()
    expect(typeof fetchSuggestions).toBe('function')
  })

  it('ha named export per reverseGeocode', async () => {
    const { reverseGeocode } = await import('../../services/geocodingService')
    
    expect(reverseGeocode).toBeDefined()
    expect(typeof reverseGeocode).toBe('function')
  })
})

// ==========================================
// TEST INTEGRAZIONE
// ==========================================

describe('geocodingService - Test integrazione', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('workflow completo: geocode → reverse geocode', async () => {
    // Prima geocodifica
    const geocodeResponse = {
      features: [{
        geometry: { coordinates: [9.19, 45.4642] },
        properties: { label: 'Milano, Lombardia, Italia' }
      }]
    }

    callORS.mockResolvedValueOnce(geocodeResponse)

    const location = await geocodeText('Milano')

    expect(location).toBeDefined()
    expect(location.lat).toBe(45.4642)
    expect(location.lon).toBe(9.19)

    // Poi reverse geocode
    const reverseResponse = {
      features: [{
        properties: { label: 'Milano Centro' }
      }]
    }

    callORS.mockResolvedValueOnce(reverseResponse)

    const placeName = await reverseGeocode(location.lat, location.lon)

    expect(placeName).toBe('Milano Centro')
  })

  it('workflow autocomplete: fetch suggestions → geocode selected', async () => {
    // Prima ottieni suggerimenti
    const suggestionsResponse = {
      features: [
        {
          geometry: { coordinates: [9.19, 45.4642] },
          properties: { label: 'Milano', id: '1' }
        },
        {
          geometry: { coordinates: [9.2277, 45.4868] },
          properties: { label: 'Monza', id: '2' }
        }
      ]
    }

    callORS.mockResolvedValueOnce(suggestionsResponse)

    const suggestions = await fetchSuggestions('Mi')

    expect(suggestions).toHaveLength(2)

    // Poi geocodifica la selezione
    const geocodeResponse = {
      features: [{
        geometry: { coordinates: [9.19, 45.4642] },
        properties: { label: 'Milano, Lombardia, Italia' }
      }]
    }

    callORS.mockResolvedValueOnce(geocodeResponse)

    const selected = await geocodeText('Milano')

    expect(selected.lat).toBe(suggestions[0].lat)
    expect(selected.lon).toBe(suggestions[0].lon)
  })

  it('gestisce errori in sequenza', async () => {
    // Prima chiamata fallisce
    callORS.mockRejectedValueOnce(new Error('Network error'))

    const result1 = await geocodeText('Milano')
    expect(result1).toBeNull()

    // Seconda chiamata ha successo
    const mockResponse = {
      features: [{
        geometry: { coordinates: [9.19, 45.4642] },
        properties: { label: 'Milano' }
      }]
    }

    callORS.mockResolvedValueOnce(mockResponse)

    const result2 = await geocodeText('Milano')
    expect(result2).not.toBeNull()
    expect(result2.lat).toBe(45.4642)
  })
})