// ==========================================
// TEST PER GPSUTILS.JS
// ==========================================
// Test delle funzioni di utilità GPS:
// - Calcolo distanze (Haversine)
// - Calcolo dislivelli (gain/loss)
// - Conversioni unità (km/mi, m/ft)
// - Formattazioni (distanza, elevazione, tempo, velocità)
// ==========================================

import { describe, it, expect } from 'vitest'
import {
  calculateDistance,
  calculateTotalDistance,
  calculateElevationGain,
  calculateElevationLoss,
  formatTime,
  calculateSpeed,
  convertDistance,
  convertElevation,
  formatDistance,
  formatStepDistance,
  formatElevation,
  formatSpeedKmh,
  formatDurationSeconds,
  formatDurationMinutes,
  formatTimestamp,
  formatTimestampForFilename,
  KM_TO_MI,
  M_TO_FT
} from '../gpsUtils'

// ==========================================
// TEST CALCOLO DISTANZE
// ==========================================

describe('calculateDistance - Formula di Haversine', () => {
  it('calcola correttamente la distanza tra Roma e Milano', () => {
    // Roma: 41.9028, 12.4964
    // Milano: 45.4642, 9.1900
    const distance = calculateDistance(41.9028, 12.4964, 45.4642, 9.1900)
    
    // La distanza reale è circa 477 km
    expect(distance).toBeGreaterThan(470)
    expect(distance).toBeLessThan(485)
  })

  it('restituisce 0 per la stessa posizione', () => {
    const distance = calculateDistance(45.0, 9.0, 45.0, 9.0)
    expect(distance).toBe(0)
  })

  it('calcola distanze brevi correttamente', () => {
    // Due punti vicini (circa 1 km di distanza)
    const distance = calculateDistance(45.0, 9.0, 45.01, 9.0)
    expect(distance).toBeGreaterThan(1.0)
    expect(distance).toBeLessThan(1.2)
  })

  it('gestisce coordinate negative', () => {
    // Sydney: -33.8688, 151.2093
    // Melbourne: -37.8136, 144.9631
    const distance = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631)
    expect(distance).toBeGreaterThan(700)
    expect(distance).toBeLessThan(750)
  })
})

describe('calculateTotalDistance - Distanza su array di coordinate', () => {
  it('calcola la distanza totale per un percorso con 3 punti', () => {
    const coordinates = [
      { lat: 45.0, lng: 9.0 },
      { lat: 45.01, lng: 9.0 },
      { lat: 45.02, lng: 9.0 }
    ]
    const totalDistance = calculateTotalDistance(coordinates)
    
    // Circa 2 km (due segmenti da ~1 km)
    expect(totalDistance).toBeGreaterThan(2.0)
    expect(totalDistance).toBeLessThan(2.5)
  })

  it('restituisce 0 per array vuoto', () => {
    expect(calculateTotalDistance([])).toBe(0)
  })

  it('restituisce 0 per array con un solo punto', () => {
    const coordinates = [{ lat: 45.0, lng: 9.0 }]
    expect(calculateTotalDistance(coordinates)).toBe(0)
  })

  it('restituisce 0 per array null o undefined', () => {
    expect(calculateTotalDistance(null)).toBe(0)
    expect(calculateTotalDistance(undefined)).toBe(0)
  })

  it('calcola correttamente con molti punti', () => {
    // Percorso con 10 punti, ciascuno distante circa 0.1 km
    const coordinates = Array.from({ length: 10 }, (_, i) => ({
      lat: 45.0 + (i * 0.001),
      lng: 9.0
    }))
    const totalDistance = calculateTotalDistance(coordinates)
    
    // 9 segmenti × ~0.11 km ≈ 1 km
    expect(totalDistance).toBeGreaterThan(0.9)
    expect(totalDistance).toBeLessThan(1.1)
  })
})

// ==========================================
// TEST CALCOLO DISLIVELLI
// ==========================================

describe('calculateElevationGain - Dislivello positivo', () => {
  it('calcola il guadagno per una salita costante', () => {
    const coordinates = [
      { lat: 45.0, lng: 9.0, altitude: 100 },
      { lat: 45.01, lng: 9.0, altitude: 150 },
      { lat: 45.02, lng: 9.0, altitude: 200 }
    ]
    const gain = calculateElevationGain(coordinates)
    expect(gain).toBe(100) // 50 + 50 = 100 metri
  })

  it('ignora le discese nel calcolo', () => {
    const coordinates = [
      { lat: 45.0, lng: 9.0, altitude: 100 },
      { lat: 45.01, lng: 9.0, altitude: 150 }, // +50
      { lat: 45.02, lng: 9.0, altitude: 120 }, // -30 (ignorato)
      { lat: 45.03, lng: 9.0, altitude: 170 }  // +50
    ]
    const gain = calculateElevationGain(coordinates)
    expect(gain).toBe(100) // Solo 50 + 50 = 100 metri
  })

  it('restituisce 0 per percorso piatto', () => {
    const coordinates = [
      { lat: 45.0, lng: 9.0, altitude: 100 },
      { lat: 45.01, lng: 9.0, altitude: 100 },
      { lat: 45.02, lng: 9.0, altitude: 100 }
    ]
    const gain = calculateElevationGain(coordinates)
    expect(gain).toBe(0)
  })

  it('restituisce 0 per discesa continua', () => {
    const coordinates = [
      { lat: 45.0, lng: 9.0, altitude: 200 },
      { lat: 45.01, lng: 9.0, altitude: 150 },
      { lat: 45.02, lng: 9.0, altitude: 100 }
    ]
    const gain = calculateElevationGain(coordinates)
    expect(gain).toBe(0)
  })

  it('gestisce altitudini mancanti (considera 0)', () => {
    const coordinates = [
      { lat: 45.0, lng: 9.0 }, // altitude: 0
      { lat: 45.01, lng: 9.0, altitude: 50 },
      { lat: 45.02, lng: 9.0, altitude: 100 }
    ]
    const gain = calculateElevationGain(coordinates)
    expect(gain).toBe(100) // 50 + 50 = 100
  })

  it('restituisce 0 per array vuoto o con un punto', () => {
    expect(calculateElevationGain([])).toBe(0)
    expect(calculateElevationGain([{ lat: 45.0, lng: 9.0, altitude: 100 }])).toBe(0)
    expect(calculateElevationGain(null)).toBe(0)
  })
})

describe('calculateElevationLoss - Dislivello negativo', () => {
  it('calcola la perdita per una discesa costante', () => {
    const coordinates = [
      { lat: 45.0, lng: 9.0, altitude: 200 },
      { lat: 45.01, lng: 9.0, altitude: 150 },
      { lat: 45.02, lng: 9.0, altitude: 100 }
    ]
    const loss = calculateElevationLoss(coordinates)
    expect(loss).toBe(100) // 50 + 50 = 100 metri
  })

  it('ignora le salite nel calcolo', () => {
    const coordinates = [
      { lat: 45.0, lng: 9.0, altitude: 100 },
      { lat: 45.01, lng: 9.0, altitude: 150 }, // +50 (ignorato)
      { lat: 45.02, lng: 9.0, altitude: 120 }, // -30
      { lat: 45.03, lng: 9.0, altitude: 70 }   // -50
    ]
    const loss = calculateElevationLoss(coordinates)
    expect(loss).toBe(80) // Solo 30 + 50 = 80 metri
  })

  it('restituisce 0 per percorso piatto', () => {
    const coordinates = [
      { lat: 45.0, lng: 9.0, altitude: 100 },
      { lat: 45.01, lng: 9.0, altitude: 100 },
      { lat: 45.02, lng: 9.0, altitude: 100 }
    ]
    const loss = calculateElevationLoss(coordinates)
    expect(loss).toBe(0)
  })

  it('restituisce 0 per salita continua', () => {
    const coordinates = [
      { lat: 45.0, lng: 9.0, altitude: 100 },
      { lat: 45.01, lng: 9.0, altitude: 150 },
      { lat: 45.02, lng: 9.0, altitude: 200 }
    ]
    const loss = calculateElevationLoss(coordinates)
    expect(loss).toBe(0)
  })
})

// ==========================================
// TEST VELOCITÀ E TEMPO
// ==========================================

describe('calculateSpeed - Velocità media', () => {
  it('calcola la velocità per 10 km in 1 ora', () => {
    const speed = calculateSpeed(10, 3600)
    expect(speed).toBe(10.0)
  })

  it('calcola la velocità per 5 km in 30 minuti', () => {
    const speed = calculateSpeed(5, 1800)
    expect(speed).toBe(10.0)
  })

  it('restituisce 0 quando il tempo è 0', () => {
    const speed = calculateSpeed(10, 0)
    expect(speed).toBe(0)
  })

  it('arrotonda correttamente a 1 decimale', () => {
    const speed = calculateSpeed(7.5, 3600)
    expect(speed).toBe(7.5)
  })

  it('gestisce velocità molto basse', () => {
    const speed = calculateSpeed(0.5, 3600)
    expect(speed).toBe(0.5)
  })
})

describe('formatTime - Formattazione tempo', () => {
  it('formatta i secondi in mm:ss per tempi sotto 1 ora', () => {
    expect(formatTime(125)).toBe('2:05')
    expect(formatTime(59)).toBe('0:59')
    expect(formatTime(600)).toBe('10:00')
  })

  it('formatta i secondi in hh:mm:ss per tempi oltre 1 ora', () => {
    expect(formatTime(3665)).toBe('1:01:05')
    expect(formatTime(7200)).toBe('2:00:00')
    expect(formatTime(3661)).toBe('1:01:01')
  })

  it('gestisce zero secondi', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('aggiunge zero padding correttamente', () => {
    expect(formatTime(3605)).toBe('1:00:05')
    expect(formatTime(61)).toBe('1:01')
  })
})

// ==========================================
// TEST CONVERSIONI UNITÀ
// ==========================================

describe('Costanti di conversione', () => {
  it('verifica la costante KM_TO_MI', () => {
    expect(KM_TO_MI).toBeCloseTo(0.621371, 5)
  })

  it('verifica la costante M_TO_FT', () => {
    expect(M_TO_FT).toBeCloseTo(3.28084, 5)
  })
})

describe('convertDistance - Conversione distanze', () => {
  it('converte km in miglia', () => {
    const miles = convertDistance(10, 'mi')
    expect(miles).toBeCloseTo(6.21371, 4)
  })

  it('mantiene i km quando unit è "km"', () => {
    const km = convertDistance(10, 'km')
    expect(km).toBe(10)
  })

  it('gestisce distanze decimali', () => {
    const miles = convertDistance(5.5, 'mi')
    expect(miles).toBeCloseTo(3.417541, 4)
  })

  it('gestisce zero', () => {
    expect(convertDistance(0, 'mi')).toBe(0)
    expect(convertDistance(0, 'km')).toBe(0)
  })
})

describe('convertElevation - Conversione elevazioni', () => {
  it('converte metri in piedi', () => {
    const feet = convertElevation(100, 'ft')
    expect(feet).toBeCloseTo(328.084, 2)
  })

  it('mantiene i metri quando unit è "m"', () => {
    const meters = convertElevation(100, 'm')
    expect(meters).toBe(100)
  })

  it('gestisce elevazioni negative', () => {
    const feet = convertElevation(-50, 'ft')
    expect(feet).toBeCloseTo(-164.042, 2)
  })

  it('gestisce zero', () => {
    expect(convertElevation(0, 'ft')).toBe(0)
    expect(convertElevation(0, 'm')).toBe(0)
  })
})

// ==========================================
// TEST FORMATTAZIONI
// ==========================================

describe('formatDistance - Formattazione distanza', () => {
  it('formatta km con 2 decimali per distanze < 10', () => {
    expect(formatDistance(5.678, 'km')).toBe('5.68 km')
    expect(formatDistance(0.5, 'km')).toBe('0.50 km')
  })

  it('formatta km con 1 decimale per distanze >= 10', () => {
    expect(formatDistance(15.678, 'km')).toBe('15.7 km')
    expect(formatDistance(100.456, 'km')).toBe('100.5 km')
  })

  it('formatta miglia correttamente', () => {
    expect(formatDistance(10, 'mi')).toBe('6.21 mi')
    expect(formatDistance(1, 'mi')).toBe('0.62 mi')
  })

  it('gestisce zero', () => {
    expect(formatDistance(0, 'km')).toBe('0.00 km')
    expect(formatDistance(0, 'mi')).toBe('0.00 mi')
  })
})

describe('formatStepDistance - Formattazione distanza per step', () => {
  it('mostra metri per distanze brevi in km', () => {
    expect(formatStepDistance(0.5, 'km')).toBe('500 m')
    expect(formatStepDistance(0.025, 'km')).toBe('25 m')
  })

  it('mostra km per distanze >= 1 km', () => {
    expect(formatStepDistance(1.5, 'km')).toBe('1.50 km')
    expect(formatStepDistance(10, 'km')).toBe('10.00 km')
  })

  it('mostra piedi per distanze brevi in mi', () => {
    expect(formatStepDistance(0.05, 'mi')).toBe('164 ft')
  })

  it('mostra miglia per distanze >= 0.1 mi', () => {
    expect(formatStepDistance(0.5, 'mi')).toContain('mi')
  })
})

describe('formatElevation - Formattazione elevazione', () => {
  it('formatta metri arrotondando', () => {
    expect(formatElevation(123.7, 'm')).toBe('124 m')
    expect(formatElevation(45.2, 'm')).toBe('45 m')
  })

  it('formatta piedi arrotondando', () => {
    expect(formatElevation(100, 'ft')).toBe('328 ft')
  })

  it('gestisce valori negativi', () => {
    expect(formatElevation(-50, 'm')).toBe('-50 m')
  })

  it('gestisce zero', () => {
    expect(formatElevation(0, 'm')).toBe('0 m')
    expect(formatElevation(0, 'ft')).toBe('0 ft')
  })
})

describe('formatSpeedKmh - Formattazione velocità', () => {
  it('formatta km/h con 1 decimale', () => {
    expect(formatSpeedKmh(15.678, 'km')).toBe('15.7 km/h')
    expect(formatSpeedKmh(5.2, 'km')).toBe('5.2 km/h')
  })

  it('converte in mph per unità miles', () => {
    const formatted = formatSpeedKmh(10, 'mi')
    expect(formatted).toContain('mph')
    expect(formatted).toContain('6.2')
  })

  it('gestisce velocità zero', () => {
    expect(formatSpeedKmh(0, 'km')).toBe('0.0 km/h')
    expect(formatSpeedKmh(0, 'mi')).toBe('0.0 mph')
  })
})

describe('formatDurationSeconds - Formattazione durata', () => {
  it('formatta in stile hms per default', () => {
    expect(formatDurationSeconds(3665, 'hms')).toBe('1:01:05')
    expect(formatDurationSeconds(125, 'hms')).toBe('2:05')
  })

  it('formatta in stile short', () => {
    expect(formatDurationSeconds(3665, 'short')).toBe('1h 1m')
    expect(formatDurationSeconds(125, 'short')).toBe('2m 5s')
    expect(formatDurationSeconds(45, 'short')).toBe('45s')
  })

  it('gestisce zero', () => {
    expect(formatDurationSeconds(0, 'hms')).toBe('0:00')
    expect(formatDurationSeconds(0, 'short')).toBe('0s')
  })

  it('gestisce ore esatte', () => {
    expect(formatDurationSeconds(7200, 'hms')).toBe('2:00:00')
    expect(formatDurationSeconds(7200, 'short')).toBe('2h 0m')
  })
})

describe('formatDurationMinutes - Formattazione durata da minuti', () => {
  it('converte minuti in secondi e formatta', () => {
    expect(formatDurationMinutes(61, 'hms')).toBe('1:01:00')
    expect(formatDurationMinutes(2.5, 'hms')).toBe('2:30')
  })

  it('gestisce null e undefined', () => {
    expect(formatDurationMinutes(null, 'hms')).toBe('0:00')
    expect(formatDurationMinutes(undefined, 'hms')).toBe('0:00')
  })

  it('arrotonda i minuti', () => {
    expect(formatDurationMinutes(1.999, 'hms')).toBe('2:00')
  })
})

describe('formatTimestamp - Formattazione timestamp', () => {
  it('formatta una data ISO in formato leggibile', () => {
    const iso = '2024-01-15T14:30:00.000Z'
    const formatted = formatTimestamp(iso, '24h')
    
    // Verifica che contenga elementi della data
    expect(formatted).toContain('15')
    expect(formatted).toContain('01')
    expect(formatted).toContain('2024')
  })

  it('gestisce formato 12h', () => {
    const iso = '2024-01-15T14:30:00.000Z'
    const formatted = formatTimestamp(iso, '12h')
    
    expect(formatted).toBeTruthy()
    expect(typeof formatted).toBe('string')
  })

  it('gestisce stringa vuota', () => {
    expect(formatTimestamp('', '24h')).toBe('')
  })

  it('gestisce null', () => {
    expect(formatTimestamp(null, '24h')).toBe('')
  })
})

describe('formatTimestampForFilename - Formattazione per nome file', () => {
  it('formatta per nome file senza caratteri speciali', () => {
    const iso = '2024-01-15T14:30:00.000Z'
    const formatted = formatTimestampForFilename(iso, '24h')
    
    // Non deve contenere : o spazi che causano problemi nei filename
    expect(formatted).not.toContain(':')
    expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/)
  })

  it('gestisce formato 12h con AM/PM', () => {
    const iso = '2024-01-15T02:30:00.000Z'
    const formatted = formatTimestampForFilename(iso, '12h')
    
    expect(formatted).toBeTruthy()
    expect(typeof formatted).toBe('string')
  })

  it('usa data corrente se iso non fornito', () => {
    const formatted = formatTimestampForFilename(null, '24h')
    
    expect(formatted).toBeTruthy()
    expect(formatted).toMatch(/\d{4}-\d{2}-\d{2}/)
  })
})