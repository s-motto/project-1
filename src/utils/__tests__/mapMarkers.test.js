// ==========================================
// TEST PER MAPMARKERS.JS
// ==========================================
// Test del factory per marker HTML su Leaflet:
// - Enum MarkerType
// - Creazione marker per ogni tipo
// - Struttura HTML e SVG
// - Stili CSS (position, transform, z-index)
// - Opzioni (index, heading)
// - Update posizione marker
// - Listener per aggiornamenti multipli
// - Rimozione marker
// ==========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  MarkerType,
  createMapMarker,
  updateMarkerPosition,
  createMarkersUpdateListener,
  removeMarkers
} from '../mapMarkers'

// ==========================================
// MOCK DI LEAFLET MAP
// ==========================================

/**
 * Crea un mock dell'oggetto map di Leaflet
 */
function createMockMap() {
  const container = document.createElement('div')
  container.id = 'map'
  document.body.appendChild(container)

  return {
    latLngToContainerPoint: vi.fn(([lat, lng]) => ({
      x: lat * 100, // Conversione semplice per test
      y: lng * 100
    })),
    getContainer: vi.fn(() => container),
    on: vi.fn(),
    off: vi.fn()
  }
}

// ==========================================
// TEST MARKER TYPE ENUM
// ==========================================

describe('MarkerType - Enum costanti', () => {
  it('contiene tutti i tipi di marker', () => {
    expect(MarkerType.START).toBe('start')
    expect(MarkerType.END).toBe('end')
    expect(MarkerType.WAYPOINT).toBe('waypoint')
    expect(MarkerType.TEMP).toBe('temp')
    expect(MarkerType.USER).toBe('user')
  })

  it('ha esattamente 5 tipi', () => {
    const keys = Object.keys(MarkerType)
    expect(keys).toHaveLength(5)
  })

  it('tutti i valori sono stringhe lowercase', () => {
    Object.values(MarkerType).forEach(value => {
      expect(typeof value).toBe('string')
      expect(value).toBe(value.toLowerCase())
    })
  })
})

// ==========================================
// TEST CREATE MAP MARKER - START
// ==========================================

describe('createMapMarker - Marker START', () => {
  let map

  beforeEach(() => {
    map = createMockMap()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('crea un marker START con SVG verde', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)

    expect(marker).toBeInstanceOf(HTMLElement)
    expect(marker.className).toContain('custom-html-marker')
    expect(marker.className).toContain('start-marker')
  })

  it('include SVG con colore verde (#10b981)', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)

    expect(marker.innerHTML).toContain('<svg')
    expect(marker.innerHTML).toContain('#10b981') // Verde
    expect(marker.innerHTML).toContain('viewBox="0 0 384 512"')
  })

  it('applica transform translate(-50%, -100%)', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)

    expect(marker.style.transform).toBe('translate(-50%, -100%)')
  })

  it('imposta position absolute', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)

    expect(marker.style.position).toBe('absolute')
  })

  it('imposta z-index 400', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)

    expect(marker.style.zIndex).toBe('400')
  })

  it('imposta pointerEvents none', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)

    expect(marker.style.pointerEvents).toBe('none')
  })

  it('calcola posizione corretta usando latLngToContainerPoint', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)

    expect(map.latLngToContainerPoint).toHaveBeenCalledWith([45.0, 9.0])
    expect(marker.style.left).toBe('4500px') // 45 * 100
    expect(marker.style.top).toBe('900px')   // 9 * 100
  })

  it('aggiunge il marker al container della mappa', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)

    const container = map.getContainer()
    expect(container.contains(marker)).toBe(true)
  })
})

// ==========================================
// TEST CREATE MAP MARKER - END
// ==========================================

describe('createMapMarker - Marker END', () => {
  let map

  beforeEach(() => {
    map = createMockMap()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('crea un marker END con SVG rosso', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.END, position)

    expect(marker).toBeInstanceOf(HTMLElement)
    expect(marker.className).toContain('end-marker')
  })

  it('include SVG con colore rosso (#ef4444)', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.END, position)

    expect(marker.innerHTML).toContain('<svg')
    expect(marker.innerHTML).toContain('#ef4444') // Rosso
  })

  it('applica transform translate(-50%, -100%)', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.END, position)

    expect(marker.style.transform).toBe('translate(-50%, -100%)')
  })

  it('imposta z-index 400', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.END, position)

    expect(marker.style.zIndex).toBe('400')
  })
})

// ==========================================
// TEST CREATE MAP MARKER - WAYPOINT
// ==========================================

describe('createMapMarker - Marker WAYPOINT', () => {
  let map

  beforeEach(() => {
    map = createMockMap()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('crea un marker WAYPOINT con numero', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.WAYPOINT, position, { index: 1 })

    expect(marker).toBeInstanceOf(HTMLElement)
    expect(marker.className).toContain('waypoint-marker')
  })

  it('mostra il numero del waypoint passato come index', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.WAYPOINT, position, { index: 3 })

    expect(marker.innerHTML).toContain('3')
  })

  it('mostra ? se index non è fornito', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.WAYPOINT, position)

    expect(marker.innerHTML).toContain('?')
  })

  it('include stili per cerchio arancione', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.WAYPOINT, position, { index: 1 })

    expect(marker.innerHTML).toContain('background: #f97316') // Arancione
    expect(marker.innerHTML).toContain('border-radius: 50%')
    expect(marker.innerHTML).toContain('width: 30px')
    expect(marker.innerHTML).toContain('height: 30px')
  })

  it('applica transform translate(-50%, -50%)', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.WAYPOINT, position, { index: 1 })

    expect(marker.style.transform).toBe('translate(-50%, -50%)')
  })

  it('imposta z-index 500', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.WAYPOINT, position, { index: 1 })

    expect(marker.style.zIndex).toBe('500')
  })

  it('gestisce numeri waypoint grandi', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.WAYPOINT, position, { index: 99 })

    expect(marker.innerHTML).toContain('99')
  })
})

// ==========================================
// TEST CREATE MAP MARKER - TEMP
// ==========================================

describe('createMapMarker - Marker TEMP', () => {
  let map

  beforeEach(() => {
    map = createMockMap()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('crea un marker TEMP con punto interrogativo', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.TEMP, position)

    expect(marker).toBeInstanceOf(HTMLElement)
    expect(marker.className).toContain('temp-marker')
    expect(marker.innerHTML).toContain('?')
  })

  it('include stili per cerchio giallo', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.TEMP, position)

    expect(marker.innerHTML).toContain('background: #eab308') // Giallo
    expect(marker.innerHTML).toContain('border-radius: 50%')
  })

  it('include animazione pulse', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.TEMP, position)

    expect(marker.innerHTML).toContain('animation: pulse')
    expect(marker.innerHTML).toContain('@keyframes pulse')
  })

  it('applica transform translate(-50%, -50%)', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.TEMP, position)

    expect(marker.style.transform).toBe('translate(-50%, -50%)')
  })

  it('imposta z-index 1000', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.TEMP, position)

    expect(marker.style.zIndex).toBe('1000')
  })

  it('include classe fade-in-marker', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.TEMP, position)

    expect(marker.className).toContain('fade-in-marker')
  })
})

// ==========================================
// TEST CREATE MAP MARKER - USER
// ==========================================

describe('createMapMarker - Marker USER', () => {
  let map

  beforeEach(() => {
    map = createMockMap()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('crea un marker USER con freccia blu', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.USER, position)

    expect(marker).toBeInstanceOf(HTMLElement)
    expect(marker.className).toContain('user-marker')
  })

  it('include SVG con colore blu (#2563eb)', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.USER, position)

    expect(marker.innerHTML).toContain('<svg')
    expect(marker.innerHTML).toContain('#2563eb') // Blu
  })

  it('applica rotazione di default 0deg se heading non fornito', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.USER, position)

    expect(marker.innerHTML).toContain('rotate(0deg)')
  })

  it('applica rotazione custom se heading è fornito', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.USER, position, { heading: 90 })

    expect(marker.innerHTML).toContain('rotate(90deg)')
  })

  it('gestisce heading negativi', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.USER, position, { heading: -45 })

    expect(marker.innerHTML).toContain('rotate(-45deg)')
  })

  it('gestisce heading oltre 360 gradi', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.USER, position, { heading: 450 })

    expect(marker.innerHTML).toContain('rotate(450deg)')
  })

  it('applica transform translate(-50%, -50%)', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.USER, position)

    expect(marker.style.transform).toBe('translate(-50%, -50%)')
  })

  it('imposta z-index 600', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.USER, position)

    expect(marker.style.zIndex).toBe('600')
  })
})

// ==========================================
// TEST ERROR HANDLING
// ==========================================

describe('createMapMarker - Error handling', () => {
  let map

  beforeEach(() => {
    map = createMockMap()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('lancia errore per tipo marker non valido', () => {
    const position = { lat: 45.0, lng: 9.0 }
    
    expect(() => {
      createMapMarker(map, 'invalid-type', position)
    }).toThrow('Tipo marker non valido')
  })

  it('lancia errore per tipo undefined', () => {
    const position = { lat: 45.0, lng: 9.0 }
    
    expect(() => {
      createMapMarker(map, undefined, position)
    }).toThrow()
  })

  it('lancia errore per tipo null', () => {
    const position = { lat: 45.0, lng: 9.0 }
    
    expect(() => {
      createMapMarker(map, null, position)
    }).toThrow()
  })
})

// ==========================================
// TEST UPDATE MARKER POSITION
// ==========================================

describe('updateMarkerPosition - Aggiornamento posizione', () => {
  let map

  beforeEach(() => {
    map = createMockMap()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('aggiorna la posizione di un marker esistente', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)

    // Nuova posizione
    const newPosition = { lat: 46.0, lng: 10.0 }
    updateMarkerPosition(marker, map, newPosition)

    expect(marker.style.left).toBe('4600px') // 46 * 100
    expect(marker.style.top).toBe('1000px')  // 10 * 100
  })

  it('gestisce marker null senza errori', () => {
    const newPosition = { lat: 46.0, lng: 10.0 }
    
    expect(() => {
      updateMarkerPosition(null, map, newPosition)
    }).not.toThrow()
  })

  it('gestisce map null senza errori', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)
    const newPosition = { lat: 46.0, lng: 10.0 }
    
    expect(() => {
      updateMarkerPosition(marker, null, newPosition)
    }).not.toThrow()
  })

  it('aggiorna correttamente più volte', () => {
    const position = { lat: 45.0, lng: 9.0 }
    const marker = createMapMarker(map, MarkerType.START, position)

    // Prima aggiornamento
    updateMarkerPosition(marker, map, { lat: 46.0, lng: 10.0 })
    expect(marker.style.left).toBe('4600px')

    // Secondo aggiornamento
    updateMarkerPosition(marker, map, { lat: 47.0, lng: 11.0 })
    expect(marker.style.left).toBe('4700px')
    expect(marker.style.top).toBe('1100px')
  })
})

// ==========================================
// TEST CREATE MARKERS UPDATE LISTENER
// ==========================================

describe('createMarkersUpdateListener - Listener multipli', () => {
  let map

  beforeEach(() => {
    map = createMockMap()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('crea una funzione listener', () => {
    const marker1 = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })
    const marker2 = createMapMarker(map, MarkerType.END, { lat: 46.0, lng: 10.0 })

    const markers = [
      { marker: marker1, position: { lat: 45.0, lng: 9.0 } },
      { marker: marker2, position: { lat: 46.0, lng: 10.0 } }
    ]

    const listener = createMarkersUpdateListener(map, markers)

    expect(typeof listener).toBe('function')
  })

  it('aggiorna tutti i marker quando chiamato', () => {
    const marker1 = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })
    const marker2 = createMapMarker(map, MarkerType.END, { lat: 46.0, lng: 10.0 })

    const markers = [
      { marker: marker1, position: { lat: 45.5, lng: 9.5 } },
      { marker: marker2, position: { lat: 46.5, lng: 10.5 } }
    ]

    const listener = createMarkersUpdateListener(map, markers)
    
    // Esegui il listener
    listener()

    // Verifica che i marker siano stati aggiornati
    expect(marker1.style.left).toBe('4550px') // 45.5 * 100
    expect(marker1.style.top).toBe('950px')   // 9.5 * 100
    expect(marker2.style.left).toBe('4650px') // 46.5 * 100
    expect(marker2.style.top).toBe('1050px')  // 10.5 * 100
  })

  it('gestisce array vuoto di marker', () => {
    const listener = createMarkersUpdateListener(map, [])

    expect(() => {
      listener()
    }).not.toThrow()
  })

  it('gestisce singolo marker', () => {
    const marker = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })
    const markers = [{ marker, position: { lat: 45.0, lng: 9.0 } }]

    const listener = createMarkersUpdateListener(map, markers)

    expect(() => {
      listener()
    }).not.toThrow()
  })

  it('può essere chiamato più volte', () => {
    const marker = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })
    const markers = [{ marker, position: { lat: 45.0, lng: 9.0 } }]

    const listener = createMarkersUpdateListener(map, markers)

    // Chiama più volte
    listener()
    listener()
    listener()

    // Verifica che non ci siano errori e la posizione sia corretta
    expect(marker.style.left).toBe('4500px')
  })
})

// ==========================================
// TEST REMOVE MARKERS
// ==========================================

describe('removeMarkers - Rimozione multipla', () => {
  let map

  beforeEach(() => {
    map = createMockMap()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('rimuove un singolo marker', () => {
    const marker = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })
    const container = map.getContainer()

    expect(container.contains(marker)).toBe(true)

    removeMarkers([marker])

    expect(container.contains(marker)).toBe(false)
  })

  it('rimuove più marker', () => {
    const marker1 = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })
    const marker2 = createMapMarker(map, MarkerType.END, { lat: 46.0, lng: 10.0 })
    const marker3 = createMapMarker(map, MarkerType.WAYPOINT, { lat: 45.5, lng: 9.5 }, { index: 1 })

    const container = map.getContainer()

    removeMarkers([marker1, marker2, marker3])

    expect(container.contains(marker1)).toBe(false)
    expect(container.contains(marker2)).toBe(false)
    expect(container.contains(marker3)).toBe(false)
  })

  it('gestisce array vuoto', () => {
    expect(() => {
      removeMarkers([])
    }).not.toThrow()
  })

  it('gestisce marker null o undefined nell array', () => {
    const marker = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })

    expect(() => {
      removeMarkers([marker, null, undefined])
    }).not.toThrow()
  })

  it('gestisce marker senza metodo remove', () => {
    const fakeMarker = document.createElement('div')

    expect(() => {
      removeMarkers([fakeMarker])
    }).not.toThrow()
  })

  it('non genera errori se chiamato due volte sugli stessi marker', () => {
    const marker = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })

    removeMarkers([marker])
    
    expect(() => {
      removeMarkers([marker])
    }).not.toThrow()
  })
})

// ==========================================
// TEST INTEGRAZIONE
// ==========================================

describe('mapMarkers - Test integrazione', () => {
  let map

  beforeEach(() => {
    map = createMockMap()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('workflow completo: crea, aggiorna, rimuovi', () => {
    // Crea marker
    const marker = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })
    expect(map.getContainer().contains(marker)).toBe(true)

    // Aggiorna posizione
    updateMarkerPosition(marker, map, { lat: 46.0, lng: 10.0 })
    expect(marker.style.left).toBe('4600px')

    // Rimuovi
    removeMarkers([marker])
    expect(map.getContainer().contains(marker)).toBe(false)
  })

  it('crea più marker di tipi diversi', () => {
    const start = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })
    const end = createMapMarker(map, MarkerType.END, { lat: 46.0, lng: 10.0 })
    const wp1 = createMapMarker(map, MarkerType.WAYPOINT, { lat: 45.3, lng: 9.3 }, { index: 1 })
    const wp2 = createMapMarker(map, MarkerType.WAYPOINT, { lat: 45.6, lng: 9.6 }, { index: 2 })
    const user = createMapMarker(map, MarkerType.USER, { lat: 45.5, lng: 9.5 }, { heading: 45 })

    const container = map.getContainer()
    const markers = container.querySelectorAll('.custom-html-marker')

    expect(markers.length).toBe(5)
  })

  it('listener aggiorna tutti i marker correttamente', () => {
    const start = createMapMarker(map, MarkerType.START, { lat: 45.0, lng: 9.0 })
    const end = createMapMarker(map, MarkerType.END, { lat: 46.0, lng: 10.0 })

    const markers = [
      { marker: start, position: { lat: 45.0, lng: 9.0 } },
      { marker: end, position: { lat: 46.0, lng: 10.0 } }
    ]

    const listener = createMarkersUpdateListener(map, markers)
    
    // Simula movimento mappa
    listener()

    // Tutti i marker devono essere nella posizione corretta
    expect(start.style.left).toBe('4500px')
    expect(end.style.left).toBe('4600px')
  })
})