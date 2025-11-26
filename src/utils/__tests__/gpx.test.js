// ==========================================
// TEST PER GPX.JS
// ==========================================
// Test della funzione di generazione GPX:
// - Struttura XML valida
// - Header e namespace GPX 1.1
// - Metadata (nome, timestamp)
// - Track points (coordinate, elevazione, timestamp)
// - Escape caratteri XML
// - Filtro punti invalidi
// ==========================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateGpxFromTrack } from '../gpx'

// ==========================================
// TEST STRUTTURA GPX BASE
// ==========================================

describe('generateGpxFromTrack - Struttura base', () => {
  it('genera un XML GPX valido con struttura completa', () => {
    const name = 'Test Track'
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.01, lng: 9.01 }
    ]
    
    const gpx = generateGpxFromTrack(name, points)
    
    // Verifica presenza elementi principali
    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(gpx).toContain('<gpx')
    expect(gpx).toContain('<metadata>')
    expect(gpx).toContain('<trk>')
    expect(gpx).toContain('<trkseg>')
    expect(gpx).toContain('<trkpt')
    expect(gpx).toContain('</trkseg>')
    expect(gpx).toContain('</trk>')
    expect(gpx).toContain('</gpx>')
  })

  it('include il namespace GPX 1.1 corretto', () => {
    const gpx = generateGpxFromTrack('Test', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('version="1.1"')
    expect(gpx).toContain('creator="HikeApp"')
    expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"')
    expect(gpx).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"')
    expect(gpx).toContain('xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"')
  })

  it('chiude correttamente tutti i tag XML', () => {
    const gpx = generateGpxFromTrack('Test', [{ lat: 45.0, lng: 9.0 }])
    
    // Conta aperture e chiusure dei tag principali
    const countTag = (tag) => {
      const openings = (gpx.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length
      const closings = (gpx.match(new RegExp(`</${tag}>`, 'g')) || []).length
      return { openings, closings }
    }
    
    expect(countTag('gpx')).toEqual({ openings: 1, closings: 1 })
    expect(countTag('metadata')).toEqual({ openings: 1, closings: 1 })
    expect(countTag('trk')).toEqual({ openings: 1, closings: 1 })
    expect(countTag('trkseg')).toEqual({ openings: 1, closings: 1 })
  })
})

// ==========================================
// TEST METADATA
// ==========================================

describe('generateGpxFromTrack - Metadata', () => {
  beforeEach(() => {
    // Mock della data per test consistenti
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('include il nome del percorso nei metadata', () => {
    const gpx = generateGpxFromTrack('Sentiero dei Fiori', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('<metadata>')
    expect(gpx).toContain('<name>Sentiero dei Fiori</name>')
  })

  it('include il nome del percorso nel track', () => {
    const gpx = generateGpxFromTrack('Monte Bianco', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('<trk><name>Monte Bianco</name>')
  })

  it('include il timestamp corrente nei metadata', () => {
    const gpx = generateGpxFromTrack('Test', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('<time>2024-01-15T10:30:00.000Z</time>')
  })

  it('gestisce nomi con caratteri speciali (escape XML)', () => {
    const gpx = generateGpxFromTrack('Test & <Special> Characters', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('Test &amp; &lt;Special&gt; Characters')
    expect(gpx).not.toContain('Test & <Special> Characters')
  })

  it('gestisce nomi null o undefined', () => {
    const gpxNull = generateGpxFromTrack(null, [{ lat: 45.0, lng: 9.0 }])
    const gpxUndefined = generateGpxFromTrack(undefined, [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpxNull).toContain('<name></name>')
    expect(gpxUndefined).toContain('<name></name>')
  })

  it('gestisce nomi vuoti', () => {
    const gpx = generateGpxFromTrack('', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('<name></name>')
  })
})

// ==========================================
// TEST TRACK POINTS - COORDINATE
// ==========================================

describe('generateGpxFromTrack - Coordinate base', () => {
  it('genera trkpt con coordinate corrette', () => {
    const points = [
      { lat: 45.123456, lng: 9.654321 },
      { lat: 46.789012, lng: 10.345678 }
    ]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('<trkpt lat="45.123456" lon="9.654321">')
    expect(gpx).toContain('<trkpt lat="46.789012" lon="10.345678">')
  })

  it('mantiene la precisione delle coordinate decimali', () => {
    const points = [{ lat: 45.1234567890, lng: 9.9876543210 }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('lat="45.123456789"')
    expect(gpx).toContain('lon="9.987654321"')
  })

  it('gestisce coordinate negative', () => {
    const points = [{ lat: -33.8688, lng: 151.2093 }] // Sydney
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('lat="-33.8688"')
    expect(gpx).toContain('lon="151.2093"')
  })

  it('gestisce coordinate a zero', () => {
    const points = [{ lat: 0, lng: 0 }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('<trkpt lat="0" lon="0">')
  })

  it('genera più trkpt per array di punti', () => {
    const points = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.1, lng: 9.1 },
      { lat: 45.2, lng: 9.2 },
      { lat: 45.3, lng: 9.3 }
    ]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    // Conta il numero di trkpt
    const trkptCount = (gpx.match(/<trkpt/g) || []).length
    expect(trkptCount).toBe(4)
  })
})

// ==========================================
// TEST ELEVAZIONE
// ==========================================

describe('generateGpxFromTrack - Elevazione', () => {
  it('include il tag <ele> quando altitude è presente', () => {
    const points = [{ lat: 45.0, lng: 9.0, altitude: 1234 }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('<ele>1234</ele>')
  })

  it('gestisce altitudini decimali', () => {
    const points = [{ lat: 45.0, lng: 9.0, altitude: 1234.56 }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('<ele>1234.56</ele>')
  })

  it('gestisce altitudini negative (sotto il livello del mare)', () => {
    const points = [{ lat: 45.0, lng: 9.0, altitude: -50 }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('<ele>-50</ele>')
  })

  it('gestisce altitudine zero', () => {
    const points = [{ lat: 45.0, lng: 9.0, altitude: 0 }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('<ele>0</ele>')
  })

  it('omette <ele> quando altitude è undefined', () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).not.toContain('<ele>')
  })

  it('omette <ele> quando altitude è null', () => {
    const points = [{ lat: 45.0, lng: 9.0, altitude: null }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).not.toContain('<ele>')
  })

  it('gestisce punti misti (alcuni con altitude, altri senza)', () => {
    const points = [
      { lat: 45.0, lng: 9.0, altitude: 100 },
      { lat: 45.1, lng: 9.1 }, // senza altitude
      { lat: 45.2, lng: 9.2, altitude: 200 }
    ]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    // Verifica che ci siano esattamente 2 tag <ele>
    const eleCount = (gpx.match(/<ele>/g) || []).length
    expect(eleCount).toBe(2)
    expect(gpx).toContain('<ele>100</ele>')
    expect(gpx).toContain('<ele>200</ele>')
  })
})

// ==========================================
// TEST TIMESTAMP
// ==========================================

describe('generateGpxFromTrack - Timestamp', () => {
  it('include il tag <time> quando timestamp è presente', () => {
    const points = [{
      lat: 45.0,
      lng: 9.0,
      timestamp: '2024-01-15T10:30:00.000Z'
    }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('<time>2024-01-15T10:30:00.000Z</time>')
  })

  it('converte timestamp in formato ISO corretto', () => {
    const points = [{
      lat: 45.0,
      lng: 9.0,
      timestamp: new Date('2024-01-15T10:30:00.000Z').getTime()
    }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('<time>2024-01-15T10:30:00.000Z</time>')
  })

  it('omette <time> quando timestamp è assente', () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    // Il tag time nei metadata ci deve essere, ma non nei trkpt
    const timeMatches = gpx.match(/<time>/g) || []
    expect(timeMatches.length).toBe(1) // Solo nei metadata
  })

  it('gestisce punti misti (alcuni con timestamp, altri senza)', () => {
    const points = [
      { lat: 45.0, lng: 9.0, timestamp: '2024-01-15T10:00:00.000Z' },
      { lat: 45.1, lng: 9.1 }, // senza timestamp
      { lat: 45.2, lng: 9.2, timestamp: '2024-01-15T10:30:00.000Z' }
    ]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    // Verifica timestamp specifici nei trkpt
    const trkptSection = gpx.substring(gpx.indexOf('<trkseg>'), gpx.indexOf('</trkseg>'))
    const timeInTrkpt = (trkptSection.match(/<time>/g) || []).length
    expect(timeInTrkpt).toBe(2)
  })
})

// ==========================================
// TEST PUNTI COMPLETI (TUTTI I CAMPI)
// ==========================================

describe('generateGpxFromTrack - Punti completi', () => {
  it('genera trkpt completo con tutti i campi', () => {
    const points = [{
      lat: 45.123456,
      lng: 9.654321,
      altitude: 1234.5,
      timestamp: '2024-01-15T10:30:00.000Z'
    }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('<trkpt lat="45.123456" lon="9.654321">')
    expect(gpx).toContain('<ele>1234.5</ele>')
    expect(gpx).toContain('<time>2024-01-15T10:30:00.000Z</time>')
    expect(gpx).toContain('</trkpt>')
  })

  it('mantiene ordine corretto dei campi (coordinate, ele, time)', () => {
    const points = [{
      lat: 45.0,
      lng: 9.0,
      altitude: 100,
      timestamp: '2024-01-15T10:30:00.000Z'
    }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    // Verifica ordine: trkpt apertura -> ele -> time -> trkpt chiusura
    const trkptStart = gpx.indexOf('<trkpt')
    const elePos = gpx.indexOf('<ele>', trkptStart)
    const timePos = gpx.indexOf('<time>', trkptStart)
    const trkptEnd = gpx.indexOf('</trkpt>', trkptStart)
    
    expect(elePos).toBeGreaterThan(trkptStart)
    expect(timePos).toBeGreaterThan(elePos)
    expect(trkptEnd).toBeGreaterThan(timePos)
  })

  it('genera correttamente una traccia realistica con più punti completi', () => {
    const points = [
      { lat: 45.0, lng: 9.0, altitude: 100, timestamp: '2024-01-15T10:00:00.000Z' },
      { lat: 45.01, lng: 9.01, altitude: 150, timestamp: '2024-01-15T10:15:00.000Z' },
      { lat: 45.02, lng: 9.02, altitude: 200, timestamp: '2024-01-15T10:30:00.000Z' }
    ]
    
    const gpx = generateGpxFromTrack('Sentiero Test', points)
    
    // Verifica tutti i punti
    expect(gpx).toContain('<trkpt lat="45" lon="9">')
    expect(gpx).toContain('<ele>100</ele>')
    expect(gpx).toContain('<time>2024-01-15T10:00:00.000Z</time>')
    
    expect(gpx).toContain('<trkpt lat="45.01" lon="9.01">')
    expect(gpx).toContain('<ele>150</ele>')
    expect(gpx).toContain('<time>2024-01-15T10:15:00.000Z</time>')
    
    expect(gpx).toContain('<trkpt lat="45.02" lon="9.02">')
    expect(gpx).toContain('<ele>200</ele>')
    expect(gpx).toContain('<time>2024-01-15T10:30:00.000Z</time>')
  })
})

// ==========================================
// TEST ESCAPE CARATTERI XML
// ==========================================

describe('generateGpxFromTrack - Escape caratteri XML', () => {
  it('esegue escape di & -> &amp;', () => {
    const gpx = generateGpxFromTrack('Rock & Roll Trail', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('Rock &amp; Roll Trail')
    expect(gpx).not.toContain('Rock & Roll Trail')
  })

  it('esegue escape di < -> &lt;', () => {
    const gpx = generateGpxFromTrack('Trail <100m', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('Trail &lt;100m')
    expect(gpx).not.toContain('Trail <100m')
  })

  it('esegue escape di > -> &gt;', () => {
    const gpx = generateGpxFromTrack('Trail >1000m', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('Trail &gt;1000m')
    expect(gpx).not.toContain('Trail >1000m')
  })

  it('gestisce caratteri multipli da fare escape', () => {
    const gpx = generateGpxFromTrack('Trail <A&B> & <C>', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('Trail &lt;A&amp;B&gt; &amp; &lt;C&gt;')
  })

  it('non altera caratteri normali', () => {
    const gpx = generateGpxFromTrack('Sentiero dei Fiori 123', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('Sentiero dei Fiori 123')
  })

  it('gestisce caratteri accentati', () => {
    const gpx = generateGpxFromTrack('Montée à la Cîme', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx).toContain('Montée à la Cîme')
  })
})

// ==========================================
// TEST VALIDAZIONE E FILTRO PUNTI
// ==========================================

describe('generateGpxFromTrack - Validazione punti', () => {
  it('filtra punti senza coordinate lat', () => {
    const points = [
      { lng: 9.0 }, // manca lat
      { lat: 45.0, lng: 9.0 } // valido
    ]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    const trkptCount = (gpx.match(/<trkpt/g) || []).length
    expect(trkptCount).toBe(1)
  })

  it('filtra punti senza coordinate lng', () => {
    const points = [
      { lat: 45.0 }, // manca lng
      { lat: 45.0, lng: 9.0 } // valido
    ]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    const trkptCount = (gpx.match(/<trkpt/g) || []).length
    expect(trkptCount).toBe(1)
  })

  it('filtra punti con lat non numerica', () => {
    const points = [
      { lat: 'invalid', lng: 9.0 },
      { lat: 45.0, lng: 9.0 }
    ]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    const trkptCount = (gpx.match(/<trkpt/g) || []).length
    expect(trkptCount).toBe(1)
  })

  it('filtra punti con lng non numerica', () => {
    const points = [
      { lat: 45.0, lng: 'invalid' },
      { lat: 45.0, lng: 9.0 }
    ]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    const trkptCount = (gpx.match(/<trkpt/g) || []).length
    expect(trkptCount).toBe(1)
  })

  it('accetta coordinate numeriche zero', () => {
    const points = [{ lat: 0, lng: 0 }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    expect(gpx).toContain('<trkpt lat="0" lon="0">')
  })

  it('filtra array di punti misti (validi e invalidi)', () => {
    const points = [
      { lat: 45.0, lng: 9.0 }, // valido
      { lat: 'abc', lng: 9.1 }, // lat invalida
      { lat: 45.2, lng: null }, // lng invalida
      { lng: 9.3 }, // manca lat
      { lat: 45.4 }, // manca lng
      { lat: 45.5, lng: 9.5 } // valido
    ]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    const trkptCount = (gpx.match(/<trkpt/g) || []).length
    expect(trkptCount).toBe(2) // Solo 2 punti validi
  })
})

// ==========================================
// TEST EDGE CASES
// ==========================================

describe('generateGpxFromTrack - Edge cases', () => {
  it('gestisce array di punti vuoto', () => {
    const gpx = generateGpxFromTrack('Test', [])
    
    // Deve generare GPX valido senza trkpt
    expect(gpx).toContain('<gpx')
    expect(gpx).toContain('<trkseg>')
    expect(gpx).toContain('</trkseg>')
    expect(gpx).not.toContain('<trkpt')
  })

  it('gestisce points null', () => {
    const gpx = generateGpxFromTrack('Test', null)
    
    expect(gpx).toContain('<gpx')
    expect(gpx).toContain('<trkseg>')
    expect(gpx).toContain('</trkseg>')
    expect(gpx).not.toContain('<trkpt')
  })

  it('gestisce points undefined', () => {
    const gpx = generateGpxFromTrack('Test', undefined)
    
    expect(gpx).toContain('<gpx')
    expect(gpx).toContain('<trkseg>')
    expect(gpx).toContain('</trkseg>')
    expect(gpx).not.toContain('<trkpt')
  })

  it('gestisce singolo punto', () => {
    const points = [{ lat: 45.0, lng: 9.0 }]
    
    const gpx = generateGpxFromTrack('Test', points)
    
    const trkptCount = (gpx.match(/<trkpt/g) || []).length
    expect(trkptCount).toBe(1)
  })

  it('gestisce traccia molto lunga (100+ punti)', () => {
    const points = Array.from({ length: 100 }, (_, i) => ({
      lat: 45.0 + (i * 0.001),
      lng: 9.0 + (i * 0.001),
      altitude: 100 + i
    }))
    
    const gpx = generateGpxFromTrack('Long Trail', points)
    
    const trkptCount = (gpx.match(/<trkpt/g) || []).length
    expect(trkptCount).toBe(100)
  })

  it('genera GPX valido anche con nome e punti vuoti', () => {
    const gpx = generateGpxFromTrack('', [])
    
    // Verifica struttura minima
    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(gpx).toContain('<gpx')
    expect(gpx).toContain('</gpx>')
  })
})

// ==========================================
// TEST OUTPUT FORMATO GPX
// ==========================================

describe('generateGpxFromTrack - Formato GPX valido', () => {
  it('genera XML che inizia con dichiarazione corretta', () => {
    const gpx = generateGpxFromTrack('Test', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  it('genera XML che termina con tag gpx chiuso', () => {
    const gpx = generateGpxFromTrack('Test', [{ lat: 45.0, lng: 9.0 }])
    
    expect(gpx.endsWith('</gpx>')).toBe(true)
  })

  it('genera GPX compatibile con standard GPX 1.1', () => {
    const points = [
      { lat: 45.0, lng: 9.0, altitude: 100, timestamp: '2024-01-15T10:00:00.000Z' }
    ]
    const gpx = generateGpxFromTrack('Test Track', points)
    
    // Verifica elementi obbligatori GPX 1.1
    expect(gpx).toContain('version="1.1"')
    expect(gpx).toContain('creator=')
    expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"')
    expect(gpx).toContain('<metadata>')
    expect(gpx).toContain('<trk>')
    expect(gpx).toContain('<trkseg>')
  })
})