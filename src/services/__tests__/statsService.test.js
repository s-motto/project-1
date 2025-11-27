// ==========================================
// TEST PER STATSSERVICE.JS
// ==========================================
// Test del servizio di calcolo statistiche:
// - calculateStats: calcolo statistiche totali
// - calculateMonthlyKm: km per mese
// - formatTime, formatKm, formatMeters: formatter
// ==========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import statsService from '../statsService'

// ==========================================
// HELPER: Crea route mock
// ==========================================

function createMockRoute({
  actualDistance = 10,
  actualDuration = 60,
  actualAscent = 100,
  completedAt = new Date().toISOString(),
  createdAt = new Date().toISOString()
} = {}) {
  return {
    actualDistance,
    actualDuration,
    actualAscent,
    completedAt,
    createdAt
  }
}

// ==========================================
// TEST CALCULATE STATS
// ==========================================

describe('calculateStats - Calcolo statistiche totali', () => {
  it('restituisce statistiche vuote per array vuoto', () => {
    const stats = statsService.calculateStats([])

    expect(stats.totalRoutes).toBe(0)
    expect(stats.totalKm).toBe(0)
    expect(stats.totalTime).toBe(0)
    expect(stats.totalAscent).toBe(0)
    expect(stats.monthlyKm).toEqual([])
  })

  it('restituisce statistiche vuote per null', () => {
    const stats = statsService.calculateStats(null)

    expect(stats.totalRoutes).toBe(0)
    expect(stats.totalKm).toBe(0)
    expect(stats.totalTime).toBe(0)
    expect(stats.totalAscent).toBe(0)
  })

  it('restituisce statistiche vuote per undefined', () => {
    const stats = statsService.calculateStats(undefined)

    expect(stats.totalRoutes).toBe(0)
    expect(stats.totalKm).toBe(0)
  })

  it('calcola statistiche per singolo route', () => {
    const routes = [createMockRoute({
      actualDistance: 5.5,
      actualDuration: 45,
      actualAscent: 150
    })]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(1)
    expect(stats.totalKm).toBe(5.5)
    expect(stats.totalTime).toBe(45)
    expect(stats.totalAscent).toBe(150)
  })

  it('calcola statistiche per multiple routes', () => {
    const routes = [
      createMockRoute({ actualDistance: 10, actualDuration: 60, actualAscent: 200 }),
      createMockRoute({ actualDistance: 15.5, actualDuration: 90, actualAscent: 300 }),
      createMockRoute({ actualDistance: 8.3, actualDuration: 50, actualAscent: 150 })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(3)
    expect(stats.totalKm).toBe(33.8) // 10 + 15.5 + 8.3
    expect(stats.totalTime).toBe(200) // 60 + 90 + 50
    expect(stats.totalAscent).toBe(650) // 200 + 300 + 150
  })

  it('filtra routes senza actualDistance', () => {
    const routes = [
      createMockRoute({ actualDistance: 10 }),
      createMockRoute({ actualDistance: null }),
      createMockRoute({ actualDistance: 0 }),
      createMockRoute({ actualDistance: 15 })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(2) // Solo 10 e 15
    expect(stats.totalKm).toBe(25) // 10 + 15
  })

  it('filtra routes con actualDistance undefined', () => {
    const routes = [
      createMockRoute({ actualDistance: 10 }),
      { actualDistance: undefined, actualDuration: 60, actualAscent: 100 },
      createMockRoute({ actualDistance: 5 })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(2)
    expect(stats.totalKm).toBe(15)
  })

  it('arrotonda totalKm a 2 decimali', () => {
    const routes = [
      createMockRoute({ actualDistance: 10.12345 }),
      createMockRoute({ actualDistance: 5.67891 })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalKm).toBe(15.80) // 10.12345 + 5.67891 = 15.80236 → 15.80
  })

  it('arrotonda totalTime a intero', () => {
    const routes = [
      createMockRoute({ actualDuration: 45.7 }),
      createMockRoute({ actualDuration: 60.3 })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalTime).toBe(106) // Math.round(45.7 + 60.3)
  })

  it('arrotonda totalAscent a intero', () => {
    const routes = [
      createMockRoute({ actualAscent: 123.7 }),
      createMockRoute({ actualAscent: 456.3 })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalAscent).toBe(580) // Math.round(123.7 + 456.3)
  })

  it('gestisce valori null nei campi', () => {
    const routes = [
      { actualDistance: 10, actualDuration: null, actualAscent: null }
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(1)
    expect(stats.totalKm).toBe(10)
    expect(stats.totalTime).toBe(0)
    expect(stats.totalAscent).toBe(0)
  })

  it('gestisce valori undefined nei campi', () => {
    const routes = [
      { actualDistance: 10, actualDuration: undefined, actualAscent: undefined }
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(1)
    expect(stats.totalKm).toBe(10)
    expect(stats.totalTime).toBe(0)
    expect(stats.totalAscent).toBe(0)
  })

  it('include monthlyKm nei risultati', () => {
    const routes = [createMockRoute({ actualDistance: 10 })]

    const stats = statsService.calculateStats(routes)

    expect(stats.monthlyKm).toBeDefined()
    expect(Array.isArray(stats.monthlyKm)).toBe(true)
  })

  it('gestisce route con distance molto piccola', () => {
    const routes = [
      createMockRoute({ actualDistance: 0.001 })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(1)
    expect(stats.totalKm).toBe(0) // Arrotondato a 2 decimali
  })

  it('gestisce valori molto grandi', () => {
    const routes = [
      createMockRoute({ 
        actualDistance: 1000, 
        actualDuration: 10000, 
        actualAscent: 5000 
      })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(1)
    expect(stats.totalKm).toBe(1000)
    expect(stats.totalTime).toBe(10000)
    expect(stats.totalAscent).toBe(5000)
  })
})

// ==========================================
// TEST CALCULATE MONTHLY KM
// ==========================================

describe('calculateMonthlyKm - Km per mese', () => {
  beforeEach(() => {
    // Mock della data per test consistenti
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('restituisce array di 6 mesi', () => {
    const routes = []
    const monthlyKm = statsService.calculateMonthlyKm(routes)

    expect(monthlyKm).toHaveLength(6)
  })

  it('ogni mese ha month e km', () => {
    const routes = []
    const monthlyKm = statsService.calculateMonthlyKm(routes)

    monthlyKm.forEach(month => {
      expect(month.month).toBeDefined()
      expect(typeof month.month).toBe('string')
      expect(month.km).toBeDefined()
      expect(typeof month.km).toBe('number')
    })
  })

  it('inizializza tutti i mesi a 0 km', () => {
    const routes = []
    const monthlyKm = statsService.calculateMonthlyKm(routes)

    monthlyKm.forEach(month => {
      expect(month.km).toBe(0)
    })
  })

  it('aggrega km per mese corrente', () => {
    const routes = [
      createMockRoute({ 
        actualDistance: 10, 
        completedAt: new Date('2024-06-10').toISOString() 
      }),
      createMockRoute({ 
        actualDistance: 15, 
        completedAt: new Date('2024-06-20').toISOString() 
      })
    ]

    const monthlyKm = statsService.calculateMonthlyKm(routes)
    const currentMonth = monthlyKm[5] // Ultimo mese (giugno)

    expect(currentMonth.km).toBe(25) // 10 + 15
  })

  it('aggrega km per mesi diversi', () => {
    const routes = [
      createMockRoute({ 
        actualDistance: 10, 
        completedAt: new Date('2024-05-15').toISOString() 
      }),
      createMockRoute({ 
        actualDistance: 20, 
        completedAt: new Date('2024-06-15').toISOString() 
      })
    ]

    const monthlyKm = statsService.calculateMonthlyKm(routes)

    // Maggio (mese precedente)
    expect(monthlyKm[4].km).toBe(10)
    // Giugno (mese corrente)
    expect(monthlyKm[5].km).toBe(20)
  })

  it('usa completedAt se disponibile', () => {
    const routes = [
      createMockRoute({ 
        actualDistance: 10,
        completedAt: new Date('2024-06-10').toISOString(),
        createdAt: new Date('2024-05-10').toISOString()
      })
    ]

    const monthlyKm = statsService.calculateMonthlyKm(routes)

    // Dovrebbe usare giugno (completedAt) non maggio (createdAt)
    expect(monthlyKm[5].km).toBe(10)
    expect(monthlyKm[4].km).toBe(0)
  })

  it('usa createdAt se completedAt è null', () => {
    const routes = [
      createMockRoute({ 
        actualDistance: 10,
        completedAt: null,
        createdAt: new Date('2024-06-10').toISOString()
      })
    ]

    const monthlyKm = statsService.calculateMonthlyKm(routes)

    expect(monthlyKm[5].km).toBe(10)
  })

  it('ignora routes senza date', () => {
    const routes = [
      createMockRoute({ 
        actualDistance: 10,
        completedAt: null,
        createdAt: null
      })
    ]

    const monthlyKm = statsService.calculateMonthlyKm(routes)

    monthlyKm.forEach(month => {
      expect(month.km).toBe(0)
    })
  })

  it('arrotonda km a 1 decimale', () => {
    const routes = [
      createMockRoute({ 
        actualDistance: 10.12345,
        completedAt: new Date('2024-06-10').toISOString()
      }),
      createMockRoute({ 
        actualDistance: 5.67891,
        completedAt: new Date('2024-06-15').toISOString()
      })
    ]

    const monthlyKm = statsService.calculateMonthlyKm(routes)
    const currentMonth = monthlyKm[5]

    expect(currentMonth.km).toBe(15.8) // 10.12345 + 5.67891 = 15.80236 → 15.8
  })

  it('ignora routes fuori dalla finestra di 6 mesi', () => {
    const routes = [
      createMockRoute({ 
        actualDistance: 10,
        completedAt: new Date('2023-12-15').toISOString() // 6+ mesi fa
      }),
      createMockRoute({ 
        actualDistance: 20,
        completedAt: new Date('2024-06-15').toISOString() // Mese corrente
      })
    ]

    const monthlyKm = statsService.calculateMonthlyKm(routes)

    // Solo il mese corrente dovrebbe avere km
    expect(monthlyKm[5].km).toBe(20)
    
    // Tutti gli altri mesi dovrebbero essere 0
    expect(monthlyKm[0].km).toBe(0)
  })

  it('formatta month in formato italiano', () => {
    const routes = []
    const monthlyKm = statsService.calculateMonthlyKm(routes)

    // Verifica formato mese italiano (es. "gen 24", "feb 24")
    monthlyKm.forEach(month => {
      expect(month.month).toMatch(/[a-z]{3}\s\d{2}/)
    })
  })
})

// ==========================================
// TEST FORMAT TIME
// ==========================================

describe('formatTime - Formatter tempo', () => {
  it('formatta solo minuti', () => {
    const formatted = statsService.formatTime(45)
    expect(formatted).toBe('45min')
  })

  it('formatta solo ore', () => {
    const formatted = statsService.formatTime(120)
    expect(formatted).toBe('2h')
  })

  it('formatta ore e minuti', () => {
    const formatted = statsService.formatTime(135)
    expect(formatted).toBe('2h 15min')
  })

  it('formatta 1 ora esatta', () => {
    const formatted = statsService.formatTime(60)
    expect(formatted).toBe('1h')
  })

  it('formatta 0 minuti', () => {
    const formatted = statsService.formatTime(0)
    expect(formatted).toBe('0min')
  })

  it('formatta valori grandi', () => {
    const formatted = statsService.formatTime(725) // 12h 5min
    expect(formatted).toBe('12h 5min')
  })

  it('gestisce 1 minuto', () => {
    const formatted = statsService.formatTime(1)
    expect(formatted).toBe('1min')
  })

  it('gestisce 59 minuti', () => {
    const formatted = statsService.formatTime(59)
    expect(formatted).toBe('59min')
  })

  it('gestisce 61 minuti', () => {
    const formatted = statsService.formatTime(61)
    expect(formatted).toBe('1h 1min')
  })
})

// ==========================================
// TEST FORMAT KM
// ==========================================

describe('formatKm - Formatter chilometri', () => {
  it('formatta km normali', () => {
    const formatted = statsService.formatKm(10.5)
    expect(formatted).toBe('10.5 km')
  })

  it('formatta km molto piccoli', () => {
    const formatted = statsService.formatKm(0.5)
    expect(formatted).toBe('0.5 km')
  })

  it('formatta km interi', () => {
    const formatted = statsService.formatKm(10)
    expect(formatted).toBe('10.0 km')
  })

  it('formatta migliaia di km con k', () => {
    const formatted = statsService.formatKm(1500)
    expect(formatted).toBe('1.5k km')
  })

  it('formatta esattamente 1000 km', () => {
    const formatted = statsService.formatKm(1000)
    expect(formatted).toBe('1.0k km')
  })

  it('formatta 0 km', () => {
    const formatted = statsService.formatKm(0)
    expect(formatted).toBe('0.0 km')
  })

  it('arrotonda a 1 decimale', () => {
    const formatted = statsService.formatKm(10.567)
    expect(formatted).toBe('10.6 km')
  })

  it('formatta km molto grandi', () => {
    const formatted = statsService.formatKm(25000)
    expect(formatted).toBe('25.0k km')
  })
})

// ==========================================
// TEST FORMAT METERS
// ==========================================

describe('formatMeters - Formatter metri', () => {
  it('formatta metri normali', () => {
    const formatted = statsService.formatMeters(500)
    expect(formatted).toBe('500 m')
  })

  it('formatta metri con separatore migliaia', () => {
    const formatted = statsService.formatMeters(1500)
    expect(formatted).toBe('1.500 m')
  })

  it('formatta 0 metri', () => {
    const formatted = statsService.formatMeters(0)
    expect(formatted).toBe('0 m')
  })

  it('formatta migliaia con k sopra 10000', () => {
    const formatted = statsService.formatMeters(15000)
    expect(formatted).toBe('15.0k m')
  })

  it('formatta esattamente 10000 metri con k', () => {
    const formatted = statsService.formatMeters(10000)
    expect(formatted).toBe('10.0k m')
  })

  it('non usa k sotto 10000', () => {
    const formatted = statsService.formatMeters(9999)
    expect(formatted).toBe('9.999 m')
  })

  it('formatta metri molto grandi', () => {
    const formatted = statsService.formatMeters(125000)
    expect(formatted).toBe('125.0k m')
  })

  it('arrotonda a 1 decimale per k', () => {
    const formatted = statsService.formatMeters(12345)
    expect(formatted).toBe('12.3k m')
  })
})

// ==========================================
// TEST INTEGRAZIONE
// ==========================================

describe('statsService - Test integrazione', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('workflow completo: calcola stats e formatta', () => {
    const routes = [
      createMockRoute({ 
        actualDistance: 15.5, 
        actualDuration: 135, 
        actualAscent: 1500,
        completedAt: new Date('2024-06-10').toISOString()
      }),
      createMockRoute({ 
        actualDistance: 8.3, 
        actualDuration: 75, 
        actualAscent: 800,
        completedAt: new Date('2024-05-15').toISOString()
      })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(2)
    expect(stats.totalKm).toBe(23.8)
    expect(stats.totalTime).toBe(210)
    expect(stats.totalAscent).toBe(2300)

    // Formatta i risultati
    const formattedTime = statsService.formatTime(stats.totalTime)
    const formattedKm = statsService.formatKm(stats.totalKm)
    const formattedAscent = statsService.formatMeters(stats.totalAscent)

    expect(formattedTime).toBe('3h 30min')
    expect(formattedKm).toBe('23.8 km')
    expect(formattedAscent).toBe('2.300 m')
  })

  it('workflow: statistiche mensili dettagliate', () => {
    const routes = [
      // Gennaio
      createMockRoute({ actualDistance: 10, completedAt: new Date('2024-01-15').toISOString() }),
      createMockRoute({ actualDistance: 15, completedAt: new Date('2024-01-20').toISOString() }),
      // Marzo  
      createMockRoute({ actualDistance: 20, completedAt: new Date('2024-03-15').toISOString() }),
      // Giugno
      createMockRoute({ actualDistance: 30, completedAt: new Date('2024-06-10').toISOString() })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalKm).toBe(75) // 10 + 15 + 20 + 30
    expect(stats.monthlyKm).toHaveLength(6)
    
    // Giugno dovrebbe avere 30 km
    expect(stats.monthlyKm[5].km).toBe(30)
  })

  it('gestisce dataset misto valido e invalido', () => {
    const routes = [
      createMockRoute({ actualDistance: 10, actualDuration: 60, actualAscent: 100 }),
      { actualDistance: null, actualDuration: 45, actualAscent: 80 }, // Invalido
      createMockRoute({ actualDistance: 0, actualDuration: 30, actualAscent: 50 }), // Invalido (0)
      createMockRoute({ actualDistance: 15, actualDuration: 90, actualAscent: 200 })
    ]

    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(2) // Solo 10 e 15
    expect(stats.totalKm).toBe(25)
    expect(stats.totalTime).toBe(150) // 60 + 90
    expect(stats.totalAscent).toBe(300) // 100 + 200
  })
})

// ==========================================
// TEST EDGE CASES
// ==========================================

describe('statsService - Edge cases', () => {
  it('gestisce array con un solo elemento', () => {
    const routes = [createMockRoute({ actualDistance: 1 })]
    const stats = statsService.calculateStats(routes)

    expect(stats.totalRoutes).toBe(1)
    expect(stats.totalKm).toBe(1)
  })

  it('gestisce valori decimali molto precisi', () => {
    const routes = [createMockRoute({ actualDistance: 10.123456789 })]
    const stats = statsService.calculateStats(routes)

    expect(stats.totalKm).toBe(10.12) // Arrotondato a 2 decimali
  })

  it('formatTime gestisce valori negativi', () => {
    const formatted = statsService.formatTime(-10)
    
    // Dovrebbe gestire in qualche modo o dare 0
    expect(formatted).toBeDefined()
  })

  it('formatKm gestisce valori negativi', () => {
    const formatted = statsService.formatKm(-10)
    
    expect(formatted).toBeDefined()
  })

  it('formatMeters gestisce valori molto grandi', () => {
    const formatted = statsService.formatMeters(1000000)
    
    expect(formatted).toContain('k m')
  })

  it('calculateMonthlyKm con date molto vecchie', () => {
    vi.setSystemTime(new Date('2024-06-15'))
    
    const routes = [
      createMockRoute({ 
        actualDistance: 10,
        completedAt: new Date('2020-01-15').toISOString() // 4 anni fa
      })
    ]

    const monthlyKm = statsService.calculateMonthlyKm(routes)

    // Non dovrebbe includere questa route
    monthlyKm.forEach(month => {
      expect(month.km).toBe(0)
    })
  })
})