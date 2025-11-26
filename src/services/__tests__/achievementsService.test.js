// ==========================================
// TEST PER ACHIEVEMENTSSERVICE.JS
// ==========================================
// Test del sistema achievements/gamification:
// - calculateLevel: livelli da km totali
// - calculatePoints: calcolo punti
// - getBadgeInfo, getLevelInfo: getter info
// - getAllBadges, getAllLevels, getAllChallenges
// ==========================================

import { describe, it, expect, beforeEach } from 'vitest'
import achievementsService from '../achievementsService'

// ==========================================
// TEST CALCULATE LEVEL
// ==========================================

describe('calculateLevel - Calcolo livello da km', () => {
  it('restituisce Livello 1 (Novizio) per 0 km', () => {
    const level = achievementsService.calculateLevel(0)

    expect(level.level).toBe(1)
    expect(level.name).toBe('Novizio')
    expect(level.minKm).toBe(0)
    expect(level.maxKm).toBe(25)
    expect(level.icon).toBe('🥉')
  })

  it('restituisce Livello 1 (Novizio) per 10 km', () => {
    const level = achievementsService.calculateLevel(10)

    expect(level.level).toBe(1)
    expect(level.name).toBe('Novizio')
  })

  it('restituisce Livello 1 (Novizio) per 24.99 km (limite superiore)', () => {
    const level = achievementsService.calculateLevel(24.99)

    expect(level.level).toBe(1)
    expect(level.name).toBe('Novizio')
  })

  it('restituisce Livello 2 (Escursionista) per 25 km esatti', () => {
    const level = achievementsService.calculateLevel(25)

    expect(level.level).toBe(2)
    expect(level.name).toBe('Escursionista')
    expect(level.minKm).toBe(25)
    expect(level.maxKm).toBe(100)
    expect(level.icon).toBe('🥈')
  })

  it('restituisce Livello 2 (Escursionista) per 50 km', () => {
    const level = achievementsService.calculateLevel(50)

    expect(level.level).toBe(2)
    expect(level.name).toBe('Escursionista')
  })

  it('restituisce Livello 2 (Escursionista) per 99.99 km', () => {
    const level = achievementsService.calculateLevel(99.99)

    expect(level.level).toBe(2)
  })

  it('restituisce Livello 3 (Esperto) per 100 km esatti', () => {
    const level = achievementsService.calculateLevel(100)

    expect(level.level).toBe(3)
    expect(level.name).toBe('Esperto')
    expect(level.minKm).toBe(100)
    expect(level.maxKm).toBe(250)
    expect(level.icon).toBe('🥇')
  })

  it('restituisce Livello 3 (Esperto) per 200 km', () => {
    const level = achievementsService.calculateLevel(200)

    expect(level.level).toBe(3)
    expect(level.name).toBe('Esperto')
  })

  it('restituisce Livello 4 (Maestro) per 250 km esatti', () => {
    const level = achievementsService.calculateLevel(250)

    expect(level.level).toBe(4)
    expect(level.name).toBe('Maestro')
    expect(level.minKm).toBe(250)
    expect(level.maxKm).toBe(500)
    expect(level.icon).toBe('💎')
  })

  it('restituisce Livello 4 (Maestro) per 400 km', () => {
    const level = achievementsService.calculateLevel(400)

    expect(level.level).toBe(4)
    expect(level.name).toBe('Maestro')
  })

  it('restituisce Livello 5 (Leggenda) per 500 km esatti', () => {
    const level = achievementsService.calculateLevel(500)

    expect(level.level).toBe(5)
    expect(level.name).toBe('Leggenda')
    expect(level.minKm).toBe(500)
    expect(level.maxKm).toBe(Infinity)
    expect(level.icon).toBe('👑')
  })

  it('restituisce Livello 5 (Leggenda) per 1000 km', () => {
    const level = achievementsService.calculateLevel(1000)

    expect(level.level).toBe(5)
    expect(level.name).toBe('Leggenda')
  })

  it('restituisce Livello 5 (Leggenda) per valori molto alti', () => {
    const level = achievementsService.calculateLevel(99999)

    expect(level.level).toBe(5)
    expect(level.name).toBe('Leggenda')
  })

  it('gestisce km negativi restituendo Livello 1', () => {
    const level = achievementsService.calculateLevel(-10)

    expect(level.level).toBe(1)
    expect(level.name).toBe('Novizio')
  })

  it('gestisce valori decimali precisi', () => {
    const level1 = achievementsService.calculateLevel(24.999999)
    expect(level1.level).toBe(1)

    const level2 = achievementsService.calculateLevel(25.000001)
    expect(level2.level).toBe(2)
  })
})

// ==========================================
// TEST CALCULATE POINTS
// ==========================================

describe('calculatePoints - Calcolo punti totali', () => {
  it('calcola punti da km (10 punti per km)', () => {
    const stats = { totalKm: 10, totalAscent: 0, totalRoutes: 0 }
    const points = achievementsService.calculatePoints(stats, 0)

    expect(points).toBe(100) // 10 km * 10 = 100
  })

  it('calcola punti da elevazione ((ascent/100)*5)', () => {
    const stats = { totalKm: 0, totalAscent: 100, totalRoutes: 0 }
    const points = achievementsService.calculatePoints(stats, 0)

    expect(points).toBe(5) // (100/100) * 5 = 5
  })

  it('calcola punti da badge (100 punti per badge)', () => {
    const stats = { totalKm: 0, totalAscent: 0, totalRoutes: 0 }
    const points = achievementsService.calculatePoints(stats, 5)

    expect(points).toBe(500) // 5 badge * 100 = 500
  })

  it('calcola punti da percorsi (50 punti per percorso)', () => {
    const stats = { totalKm: 0, totalAscent: 0, totalRoutes: 10 }
    const points = achievementsService.calculatePoints(stats, 0)

    expect(points).toBe(500) // 10 routes * 50 = 500
  })

  it('somma punti da tutte le fonti', () => {
    const stats = { totalKm: 20, totalAscent: 500, totalRoutes: 5 }
    const badgesCount = 3
    const points = achievementsService.calculatePoints(stats, badgesCount)

    // 20 km * 10 = 200
    // (500/100) * 5 = 25
    // 5 routes * 50 = 250
    // 3 badge * 100 = 300
    // Totale = 775
    expect(points).toBe(775)
  })

  it('arrotonda i punti a numero intero', () => {
    const stats = { totalKm: 5.7, totalAscent: 156, totalRoutes: 2 }
    const points = achievementsService.calculatePoints(stats, 0)

    // 5.7 * 10 = 57 (arrotondato)
    // (156/100) * 5 = 7.8 → 8 (arrotondato)
    // 2 * 50 = 100
    // Totale = 165
    expect(points).toBe(165)
  })

  it('gestisce valori zero', () => {
    const stats = { totalKm: 0, totalAscent: 0, totalRoutes: 0 }
    const points = achievementsService.calculatePoints(stats, 0)

    expect(points).toBe(0)
  })

  it('calcola correttamente esempio realistico', () => {
    const stats = { totalKm: 150, totalAscent: 3500, totalRoutes: 25 }
    const badgesCount = 8
    const points = achievementsService.calculatePoints(stats, badgesCount)

    // 150 * 10 = 1500
    // (3500/100) * 5 = 175
    // 25 * 50 = 1250
    // 8 * 100 = 800
    // Totale = 3725
    expect(points).toBe(3725)
  })

  it('gestisce ascent frazionario', () => {
    const stats = { totalKm: 10, totalAscent: 257, totalRoutes: 1 }
    const points = achievementsService.calculatePoints(stats, 0)

    // 10 * 10 = 100
    // (257/100) * 5 = 12.85 → 13 (arrotondato)
    // 1 * 50 = 50
    // Totale = 163
    expect(points).toBe(163)
  })
})

// ==========================================
// TEST GET ALL BADGES
// ==========================================

describe('getAllBadges - Ottieni tutti i badge', () => {
  it('restituisce oggetto con tutti i badge', () => {
    const badges = achievementsService.getAllBadges()

    expect(badges).toBeDefined()
    expect(typeof badges).toBe('object')
  })

  it('include badge first_hike', () => {
    const badges = achievementsService.getAllBadges()

    expect(badges.first_hike).toBeDefined()
    expect(badges.first_hike.id).toBe('first_hike')
    expect(badges.first_hike.name).toBeDefined()
    expect(badges.first_hike.description).toBeDefined()
    expect(badges.first_hike.icon).toBeDefined()
  })

  it('include badge marathon', () => {
    const badges = achievementsService.getAllBadges()

    expect(badges.marathon).toBeDefined()
    expect(badges.marathon.id).toBe('marathon')
  })

  it('include badge climber', () => {
    const badges = achievementsService.getAllBadges()

    expect(badges.climber).toBeDefined()
    expect(badges.climber.id).toBe('climber')
  })

  it('include badge mountain_king', () => {
    const badges = achievementsService.getAllBadges()

    expect(badges.mountain_king).toBeDefined()
    expect(badges.mountain_king.id).toBe('mountain_king')
  })

  it('tutti i badge hanno campi richiesti', () => {
    const badges = achievementsService.getAllBadges()

    Object.values(badges).forEach(badge => {
      expect(badge.id).toBeDefined()
      expect(badge.name).toBeDefined()
      expect(badge.description).toBeDefined()
      expect(badge.icon).toBeDefined()
    })
  })

  it('ha almeno 10 badge', () => {
    const badges = achievementsService.getAllBadges()
    const badgeCount = Object.keys(badges).length

    expect(badgeCount).toBeGreaterThanOrEqual(10)
  })
})

// ==========================================
// TEST GET BADGE INFO
// ==========================================

describe('getBadgeInfo - Ottieni info badge specifico', () => {
  it('restituisce info badge first_hike', () => {
    const badge = achievementsService.getBadgeInfo('first_hike')

    expect(badge).toBeDefined()
    expect(badge.id).toBe('first_hike')
    expect(badge.name).toBeDefined()
    expect(badge.description).toBeDefined()
    expect(badge.icon).toBeDefined()
  })

  it('restituisce info badge marathon', () => {
    const badge = achievementsService.getBadgeInfo('marathon')

    expect(badge).toBeDefined()
    expect(badge.id).toBe('marathon')
  })

  it('restituisce info badge climber', () => {
    const badge = achievementsService.getBadgeInfo('climber')

    expect(badge).toBeDefined()
    expect(badge.id).toBe('climber')
  })

  it('restituisce null per badge inesistente', () => {
    const badge = achievementsService.getBadgeInfo('invalid_badge')

    expect(badge).toBeNull()
  })

  it('restituisce null per badge undefined', () => {
    const badge = achievementsService.getBadgeInfo(undefined)

    expect(badge).toBeNull()
  })

  it('restituisce null per badge null', () => {
    const badge = achievementsService.getBadgeInfo(null)

    expect(badge).toBeNull()
  })

  it('restituisce null per stringa vuota', () => {
    const badge = achievementsService.getBadgeInfo('')

    expect(badge).toBeNull()
  })
})

// ==========================================
// TEST GET LEVEL INFO
// ==========================================

describe('getLevelInfo - Ottieni info livello specifico', () => {
  it('restituisce info Livello 1 (Novizio)', () => {
    const level = achievementsService.getLevelInfo(1)

    expect(level).toBeDefined()
    expect(level.level).toBe(1)
    expect(level.name).toBe('Novizio')
    expect(level.minKm).toBe(0)
    expect(level.maxKm).toBe(25)
    expect(level.icon).toBe('🥉')
  })

  it('restituisce info Livello 2 (Escursionista)', () => {
    const level = achievementsService.getLevelInfo(2)

    expect(level).toBeDefined()
    expect(level.level).toBe(2)
    expect(level.name).toBe('Escursionista')
    expect(level.minKm).toBe(25)
    expect(level.maxKm).toBe(100)
    expect(level.icon).toBe('🥈')
  })

  it('restituisce info Livello 3 (Esperto)', () => {
    const level = achievementsService.getLevelInfo(3)

    expect(level).toBeDefined()
    expect(level.level).toBe(3)
    expect(level.name).toBe('Esperto')
    expect(level.icon).toBe('🥇')
  })

  it('restituisce info Livello 4 (Maestro)', () => {
    const level = achievementsService.getLevelInfo(4)

    expect(level).toBeDefined()
    expect(level.level).toBe(4)
    expect(level.name).toBe('Maestro')
    expect(level.icon).toBe('💎')
  })

  it('restituisce info Livello 5 (Leggenda)', () => {
    const level = achievementsService.getLevelInfo(5)

    expect(level).toBeDefined()
    expect(level.level).toBe(5)
    expect(level.name).toBe('Leggenda')
    expect(level.minKm).toBe(500)
    expect(level.maxKm).toBe(Infinity)
    expect(level.icon).toBe('👑')
  })

  it('restituisce Livello 1 per livello 0', () => {
    const level = achievementsService.getLevelInfo(0)

    expect(level).toBeDefined()
    expect(level.level).toBe(1)
  })

  it('restituisce Livello 1 per livello inesistente (6)', () => {
    const level = achievementsService.getLevelInfo(6)

    expect(level).toBeDefined()
    expect(level.level).toBe(1)
  })

  it('restituisce Livello 1 per livello negativo', () => {
    const level = achievementsService.getLevelInfo(-1)

    expect(level).toBeDefined()
    expect(level.level).toBe(1)
  })

  it('restituisce Livello 1 per null', () => {
    const level = achievementsService.getLevelInfo(null)

    expect(level).toBeDefined()
    expect(level.level).toBe(1)
  })

  it('restituisce Livello 1 per undefined', () => {
    const level = achievementsService.getLevelInfo(undefined)

    expect(level).toBeDefined()
    expect(level.level).toBe(1)
  })
})

// ==========================================
// TEST GET ALL LEVELS
// ==========================================

describe('getAllLevels - Ottieni tutti i livelli', () => {
  it('restituisce array con tutti i livelli', () => {
    const levels = achievementsService.getAllLevels()

    expect(levels).toBeDefined()
    expect(Array.isArray(levels)).toBe(true)
  })

  it('ha esattamente 5 livelli', () => {
    const levels = achievementsService.getAllLevels()

    expect(levels).toHaveLength(5)
  })

  it('livelli sono in ordine crescente', () => {
    const levels = achievementsService.getAllLevels()

    expect(levels[0].level).toBe(1)
    expect(levels[1].level).toBe(2)
    expect(levels[2].level).toBe(3)
    expect(levels[3].level).toBe(4)
    expect(levels[4].level).toBe(5)
  })

  it('ogni livello ha tutti i campi richiesti', () => {
    const levels = achievementsService.getAllLevels()

    levels.forEach(level => {
      expect(level.level).toBeDefined()
      expect(level.name).toBeDefined()
      expect(level.minKm).toBeDefined()
      expect(level.maxKm).toBeDefined()
      expect(level.icon).toBeDefined()
    })
  })

  it('minKm sono progressivi', () => {
    const levels = achievementsService.getAllLevels()

    expect(levels[0].minKm).toBe(0)
    expect(levels[1].minKm).toBe(25)
    expect(levels[2].minKm).toBe(100)
    expect(levels[3].minKm).toBe(250)
    expect(levels[4].minKm).toBe(500)
  })

  it('ultimo livello ha maxKm Infinity', () => {
    const levels = achievementsService.getAllLevels()
    const lastLevel = levels[levels.length - 1]

    expect(lastLevel.maxKm).toBe(Infinity)
  })
})

// ==========================================
// TEST GET ALL CHALLENGES
// ==========================================

describe('getAllChallenges - Ottieni tutte le sfide', () => {
  it('restituisce array con tutte le sfide', () => {
    const challenges = achievementsService.getAllChallenges()

    expect(challenges).toBeDefined()
    expect(Array.isArray(challenges)).toBe(true)
  })

  it('ha almeno 10 sfide', () => {
    const challenges = achievementsService.getAllChallenges()

    expect(challenges.length).toBeGreaterThanOrEqual(10)
  })

  it('ogni sfida ha tutti i campi richiesti', () => {
    const challenges = achievementsService.getAllChallenges()

    challenges.forEach(challenge => {
      expect(challenge.id).toBeDefined()
      expect(challenge.name).toBeDefined()
      expect(challenge.description).toBeDefined()
      expect(challenge.icon).toBeDefined()
      expect(typeof challenge.checkCompletion).toBe('function')
    })
  })

  it('include sfida distance_5km', () => {
    const challenges = achievementsService.getAllChallenges()
    const challenge = challenges.find(c => c.id === 'distance_5km')

    expect(challenge).toBeDefined()
    expect(challenge.name).toBeDefined()
  })

  it('include sfida elevation_200m', () => {
    const challenges = achievementsService.getAllChallenges()
    const challenge = challenges.find(c => c.id === 'elevation_200m')

    expect(challenge).toBeDefined()
  })

  it('include sfida complete_route', () => {
    const challenges = achievementsService.getAllChallenges()
    const challenge = challenges.find(c => c.id === 'complete_route')

    expect(challenge).toBeDefined()
  })

  it('le funzioni checkCompletion sono callable', () => {
    const challenges = achievementsService.getAllChallenges()
    const todayStats = { distance: 10, elevation: 300, routesCompleted: 2 }

    // Verifica che tutte le funzioni siano chiamabili senza errori
    challenges.forEach(challenge => {
      expect(() => {
        challenge.checkCompletion(todayStats)
      }).not.toThrow()
    })
  })
})

// ==========================================
// TEST INTEGRAZIONE
// ==========================================

describe('achievementsService - Test integrazione', () => {
  it('workflow completo: calcola livello e punti per nuovo utente', () => {
    const stats = { totalKm: 30, totalAscent: 500, totalRoutes: 3 }
    const badgesCount = 2

    const level = achievementsService.calculateLevel(stats.totalKm)
    const points = achievementsService.calculatePoints(stats, badgesCount)

    expect(level.level).toBe(2) // 30 km → Escursionista
    expect(level.name).toBe('Escursionista')
    // (30*10) + ((500/100)*5) + (3*50) + (2*100) = 300 + 25 + 150 + 200 = 675
    expect(points).toBe(675)
  })

  it('workflow: progressione da Novizio a Esperto', () => {
    // Inizio
    let level = achievementsService.calculateLevel(10)
    expect(level.level).toBe(1)
    expect(level.name).toBe('Novizio')

    // Dopo 50 km
    level = achievementsService.calculateLevel(50)
    expect(level.level).toBe(2)
    expect(level.name).toBe('Escursionista')

    // Dopo 150 km
    level = achievementsService.calculateLevel(150)
    expect(level.level).toBe(3)
    expect(level.name).toBe('Esperto')
  })

  it('workflow: calcolo badge info per achievements', () => {
    const badges = achievementsService.getAllBadges()
    const earnedBadges = ['first_hike', 'marathon', 'climber']

    const badgesInfo = earnedBadges.map(id => 
      achievementsService.getBadgeInfo(id)
    ).filter(b => b !== null)

    expect(badgesInfo).toHaveLength(3)
    badgesInfo.forEach(badge => {
      expect(badge.id).toBeDefined()
      expect(badge.name).toBeDefined()
    })
  })

  it('workflow: livello massimo e punti molto alti', () => {
    const stats = { totalKm: 1000, totalAscent: 10000, totalRoutes: 150 }
    const badgesCount = 15

    const level = achievementsService.calculateLevel(stats.totalKm)
    const points = achievementsService.calculatePoints(stats, badgesCount)

    expect(level.level).toBe(5)
    expect(level.name).toBe('Leggenda')
    expect(level.maxKm).toBe(Infinity)
    // (1000*10) + ((10000/100)*5) + (150*50) + (15*100) = 10000 + 500 + 7500 + 1500 = 19500
    expect(points).toBe(19500)
  })

  it('workflow: ottieni info per level up', () => {
    const currentKm = 95
    const currentLevel = achievementsService.calculateLevel(currentKm)
    const nextLevel = achievementsService.getLevelInfo(currentLevel.level + 1)

    expect(currentLevel.level).toBe(2)
    expect(nextLevel.level).toBe(3)
    expect(nextLevel.minKm).toBe(100)

    const kmToNext = nextLevel.minKm - currentKm
    expect(kmToNext).toBe(5) // Mancano 5 km
  })
})

// ==========================================
// TEST EDGE CASES
// ==========================================

describe('achievementsService - Edge cases', () => {
  it('calculateLevel con valori estremi positivi', () => {
    const level = achievementsService.calculateLevel(Number.MAX_SAFE_INTEGER)

    expect(level.level).toBe(5)
    expect(level.name).toBe('Leggenda')
  })

  it('calculatePoints con valori molto grandi', () => {
    const stats = { totalKm: 10000, totalAscent: 100000, totalRoutes: 1000 }
    const points = achievementsService.calculatePoints(stats, 100)

    expect(points).toBeGreaterThan(0)
    expect(typeof points).toBe('number')
  })

  it('getAllBadges restituisce sempre lo stesso oggetto', () => {
    const badges1 = achievementsService.getAllBadges()
    const badges2 = achievementsService.getAllBadges()

    expect(badges1).toBe(badges2)
  })

  it('getAllLevels restituisce sempre lo stesso array', () => {
    const levels1 = achievementsService.getAllLevels()
    const levels2 = achievementsService.getAllLevels()

    expect(levels1).toBe(levels2)
  })

  it('getAllChallenges restituisce sempre lo stesso array', () => {
    const challenges1 = achievementsService.getAllChallenges()
    const challenges2 = achievementsService.getAllChallenges()

    expect(challenges1).toBe(challenges2)
  })

  it('getBadgeInfo con caratteri speciali', () => {
    const badge = achievementsService.getBadgeInfo('badge@#$%')

    expect(badge).toBeNull()
  })

  it('getLevelInfo con stringa invece di numero', () => {
    const level = achievementsService.getLevelInfo('invalid')

    expect(level).toBeDefined()
    expect(level.level).toBe(1)
  })
})