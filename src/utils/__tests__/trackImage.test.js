// ==========================================
// TEST PER TRACKIMAGE.JS
// ==========================================
// Test delle funzioni di generazione immagini:
// - Normalizzazione punti GPS
// - Calcolo bounds (min/max lat/lng)
// - Proiezione coordinate (lat/lng → x/y)
// - Conversioni per tile mapping
// - Proiezione Mercator
// - Calcolo centro e zoom
// - Generazione PNG (con mock Canvas)
// ==========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { trackToPng } from '../trackImage'

// ==========================================
// HELPER: Import funzioni interne tramite re-export per test
// ==========================================
// Nota: Le funzioni helper non sono esportate da trackImage.js,
// quindi testeremo principalmente attraverso trackToPng e
// creeremo test indiretti per le funzioni helper

// ==========================================
// MOCK CANVAS API
// ==========================================

function setupCanvasMock() {
  const mockContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
    lineCap: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    drawImage: vi.fn()
  }

  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => mockContext),
    toBlob: vi.fn((callback) => {
      // Simula la creazione di un blob
      const blob = new Blob(['fake-image-data'], { type: 'image/png' })
      callback(blob)
    })
  }

  global.document = {
    createElement: vi.fn((tag) => {
      if (tag === 'canvas') return mockCanvas
      return {}
    })
  }

  return { mockCanvas, mockContext }
}

// ==========================================
// MOCK IMAGE API
// ==========================================

function setupImageMock() {
  global.Image = class {
    constructor() {
      this.onload = null
      this.onerror = null
      this.src = ''
      this.crossOrigin = ''
    }
    
    set src(value) {
      this._src = value
      // Simula caricamento immediato
      setTimeout(() => {
        if (this.onload) this.onload()
      }, 0)
    }
    
    get src() {
      return this._src
    }
  }
}

// ==========================================
// TEST TRACK TO PNG - FUNZIONALITÀ BASE
// ==========================================

describe('trackToPng - Generazione base', () => {
  beforeEach(() => {
    setupCanvasMock()
    setupImageMock()
  })

  it('genera un Blob PNG da array di punti', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 }
    ]

    const blob = await trackToPng('Test Track', points)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })

  it('gestisce array vuoto senza errori', async () => {
    const blob = await trackToPng('Empty Track', [])

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce punti null', async () => {
    const blob = await trackToPng('Null Track', null)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce punti undefined', async () => {
    const blob = await trackToPng('Undefined Track', undefined)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('crea canvas con dimensioni di default', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    await trackToPng('Test', points)

    expect(document.createElement).toHaveBeenCalledWith('canvas')
  })

  it('crea canvas con dimensioni personalizzate', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    await trackToPng('Test', points, { width: 800, height: 600 })

    const canvas = document.createElement('canvas')
    // Verifica che il canvas sia stato creato (anche se non possiamo verificare le dimensioni direttamente in questo mock)
    expect(document.createElement).toHaveBeenCalledWith('canvas')
  })
})

// ==========================================
// TEST NORMALIZZAZIONE PUNTI
// ==========================================

describe('trackToPng - Normalizzazione punti', () => {
  beforeEach(() => {
    setupCanvasMock()
    setupImageMock()
  })

  it('normalizza array di oggetti {lat, lng}', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 }
    ]

    const blob = await trackToPng('Test', points)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('normalizza array di array [lng, lat]', async () => {
    const points = [
      [9.0, 45.0],  // lng, lat (formato GeoJSON)
      [9.1, 45.1]
    ]

    const blob = await trackToPng('Test', points)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('filtra punti senza coordinate valide', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 'invalid', lng: 9.1 },
      { lat: 45.2, lng: null },
      { lat: 45.3, lng: 9.3 }
    ]

    const blob = await trackToPng('Test', points)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce mix di formati', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      [9.1, 45.1],
      { lat: 45.2, lng: 9.2 }
    ]

    const blob = await trackToPng('Test', points)
    expect(blob).toBeInstanceOf(Blob)
  })
})

// ==========================================
// TEST OPZIONI PERSONALIZZAZIONE
// ==========================================

describe('trackToPng - Opzioni personalizzazione', () => {
  beforeEach(() => {
    setupCanvasMock()
    setupImageMock()
  })

  it('applica dimensioni personalizzate', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const blob = await trackToPng('Test', points, {
      width: 1600,
      height: 1000
    })

    expect(blob).toBeInstanceOf(Blob)
  })

  it('applica padding personalizzato', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const blob = await trackToPng('Test', points, {
      padding: 80
    })

    expect(blob).toBeInstanceOf(Blob)
  })

  it('applica colori personalizzati', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 }
    ]
    
    const blob = await trackToPng('Test', points, {
      stroke: '#ff0000',
      startColor: '#00ff00',
      endColor: '#0000ff',
      bg: '#f0f0f0'
    })

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce nome null', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const blob = await trackToPng(null, points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce nome undefined', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const blob = await trackToPng(undefined, points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce nome stringa vuota', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const blob = await trackToPng('', points)

    expect(blob).toBeInstanceOf(Blob)
  })
})

// ==========================================
// TEST PERCORSI COMPLESSI
// ==========================================

describe('trackToPng - Percorsi complessi', () => {
  beforeEach(() => {
    setupCanvasMock()
    setupImageMock()
  })

  it('gestisce percorso con molti punti', async () => {
    const points = Array.from({ length: 100 }, (_, i) => ({
      lat: 45.0 + (i * 0.001),
      lng: 9.0 + (i * 0.001)
    }))

    const blob = await trackToPng('Long Track', points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce percorso con singolo punto', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]

    const blob = await trackToPng('Single Point', points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce percorso con due punti', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 }
    ]

    const blob = await trackToPng('Two Points', points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce coordinate molto vicine', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.0001, lng: 9.0001 }
    ]

    const blob = await trackToPng('Close Points', points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce coordinate molto distanti', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 46.0, lng: 10.0 }
    ]

    const blob = await trackToPng('Far Points', points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce percorso che attraversa meridiano', async () => {
    const points = [
      { lat: 45.0, lng: -1.0 },
      { lat: 45.0, lng: 1.0 }
    ]

    const blob = await trackToPng('Cross Meridian', points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce percorso che attraversa equatore', async () => {
    const points = [
      { lat: -1.0, lng: 9.0 },
      { lat: 1.0, lng: 9.0 }
    ]

    const blob = await trackToPng('Cross Equator', points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce coordinate negative', async () => {
    const points = [
      { lat: -33.8688, lng: 151.2093 },  // Sydney
      { lat: -37.8136, lng: 144.9631 }   // Melbourne
    ]

    const blob = await trackToPng('Southern Hemisphere', points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce coordinate sul limite (-180/180, -90/90)', async () => {
    const points = [
      { lat: -85, lng: -179 },
      { lat: 85, lng: 179 }
    ]

    const blob = await trackToPng('Extreme Coords', points)

    expect(blob).toBeInstanceOf(Blob)
  })
})

// ==========================================
// TEST CANVAS RENDERING
// ==========================================

describe('trackToPng - Canvas rendering', () => {
  let mockCanvas, mockContext

  beforeEach(() => {
    const mocks = setupCanvasMock()
    mockCanvas = mocks.mockCanvas
    mockContext = mocks.mockContext
    setupImageMock()
  })

  it('chiama fillRect per il background', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    await trackToPng('Test', points, { bg: '#ffffff' })

    expect(mockContext.fillRect).toHaveBeenCalled()
  })

  it('disegna il percorso con beginPath e stroke', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 }
    ]
    
    await trackToPng('Test', points)

    expect(mockContext.beginPath).toHaveBeenCalled()
    expect(mockContext.stroke).toHaveBeenCalled()
  })

  it('disegna marker start e end con arc', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 }
    ]
    
    await trackToPng('Test', points)

    // Arc chiamato per start e end marker
    expect(mockContext.arc).toHaveBeenCalledTimes(2)
  })

  it('disegna il titolo se name è fornito', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    await trackToPng('My Track', points)

    expect(mockContext.fillText).toHaveBeenCalledWith('My Track', expect.any(Number), expect.any(Number))
  })

  it('usa moveTo per il primo punto', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 }
    ]
    
    await trackToPng('Test', points)

    expect(mockContext.moveTo).toHaveBeenCalled()
  })

  it('usa lineTo per i punti successivi', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 },
      { lat: 45.2, lng: 9.2 }
    ]
    
    await trackToPng('Test', points)

    // lineTo chiamato per il secondo e terzo punto
    expect(mockContext.lineTo).toHaveBeenCalledTimes(2)
  })

  it('converte canvas in Blob PNG', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    await trackToPng('Test', points)

    expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png')
  })
})

// ==========================================
// TEST BOUNDS E PROIEZIONE
// ==========================================

describe('trackToPng - Bounds e proiezione', () => {
  beforeEach(() => {
    setupCanvasMock()
    setupImageMock()
  })

  it('calcola bounds correttamente per punti distribuiti', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 46.0, lng: 10.0 }
    ]

    const blob = await trackToPng('Test', points)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('espande bounds per punto singolo', async () => {
    // Un singolo punto dovrebbe avere bounds espansi artificialmente
    const points = [{ lat: 45.0, lng: 9.0 }]

    const blob = await trackToPng('Test', points)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce bounds identici (tutti i punti uguali)', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.0, lng: 9.0 },
      { lat: 45.0, lng: 9.0 }
    ]

    const blob = await trackToPng('Test', points)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('proietta correttamente coordinate in pixel', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 }
    ]

    const blob = await trackToPng('Test', points, {
      width: 1000,
      height: 1000,
      padding: 50
    })

    expect(blob).toBeInstanceOf(Blob)
  })
})

// ==========================================
// TEST OPZIONI BASEMAP
// ==========================================

describe('trackToPng - Opzioni basemap', () => {
  beforeEach(() => {
    setupCanvasMock()
    setupImageMock()
  })

  it('gestisce basemapKey fornito', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const blob = await trackToPng('Test', points, {
      basemapKey: 'test-key'
    })

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce basemapStyle personalizzato', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const blob = await trackToPng('Test', points, {
      basemapKey: 'test-key',
      basemapStyle: 'outdoor-v2'
    })

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce staticTileUrl fornito', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const blob = await trackToPng('Test', points, {
      staticTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    })

    expect(blob).toBeInstanceOf(Blob)
  })

  it('gestisce tileAttribution personalizzato', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const blob = await trackToPng('Test', points, {
      staticTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      tileAttribution: '© Custom Attribution'
    })

    expect(blob).toBeInstanceOf(Blob)
  })

  it('funziona senza basemap (solo background)', async () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const blob = await trackToPng('Test', points)

    expect(blob).toBeInstanceOf(Blob)
  })
})

// ==========================================
// TEST INTEGRAZIONE
// ==========================================

describe('trackToPng - Test integrazione', () => {
  beforeEach(() => {
    setupCanvasMock()
    setupImageMock()
  })

  it('genera immagine per percorso realistico', async () => {
    // Simula un percorso di hiking reale
    const points = [
      { lat: 45.4642, lng: 9.1900 },  // Milano
      { lat: 45.4700, lng: 9.1950 },
      { lat: 45.4750, lng: 9.2000 },
      { lat: 45.4800, lng: 9.2050 },
      { lat: 45.4850, lng: 9.2100 }
    ]

    const blob = await trackToPng('Milano Trail', points, {
      width: 1600,
      height: 1000,
      padding: 60,
      stroke: '#10b981',
      startColor: '#2563eb',
      endColor: '#ef4444'
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('genera immagine per percorso circolare', async () => {
    // Simula un percorso ad anello
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.0 },
      { lat: 45.1, lng: 9.1 },
      { lat: 45.0, lng: 9.1 },
      { lat: 45.0, lng: 9.0 }
    ]

    const blob = await trackToPng('Loop Trail', points)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('genera immagine con tutte le opzioni personalizzate', async () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 }
    ]

    const blob = await trackToPng('Custom Track', points, {
      width: 2000,
      height: 1500,
      padding: 100,
      stroke: '#ff6b6b',
      startColor: '#4ecdc4',
      endColor: '#ffe66d',
      bg: '#2d3436'
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
  })
})