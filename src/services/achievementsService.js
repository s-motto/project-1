import { databases } from '../appwrite'
import { ID, Query } from 'appwrite'
import logger from '../utils/logger'

// Configurazione database
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'hiking_db'
const ACHIEVEMENTS_COLLECTION_ID = 'achievements'

// Definizione badge con metadati
const BADGES = {
  first_hike: {
    id: 'first_hike',
    name: '🥾 Primi Passi',
    description: 'Completa il tuo primo percorso',
    icon: '🥾'
  },
  marathon: {
    id: 'marathon',
    name: '🏃 Maratoneta',
    description: 'Percorri 42 km in totale',
    icon: '🏃'
  },
  climber: {
    id: 'climber',
    name: '⛰️ Scalatore',
    description: 'Supera 1000m di dislivello totale',
    icon: '⛰️'
  },
  explorer: {
    id: 'explorer',
    name: '📍 Esploratore',
    description: 'Completa 10 percorsi diversi',
    icon: '📍'
  },
  speedster: {
    id: 'speedster',
    name: '⏱️ Velocista',
    description: 'Completa un percorso in meno dell\'80% del tempo stimato',
    icon: '⏱️'
  },
  // NUOVI BADGE FASE 2
  streak_7: {
    id: 'streak_7',
    name: '🔥 Costante',
    description: 'Mantieni uno streak di 7 giorni',
    icon: '🔥'
  },
  streak_30: {
    id: 'streak_30',
    name: '💪 Instancabile',
    description: 'Mantieni uno streak di 30 giorni',
    icon: '💪'
  },
  triple_day: {
    id: 'triple_day',
    name: '⚡ Fulmine',
    description: 'Completa 3 percorsi in un solo giorno',
    icon: '⚡'
  },
  early_riser_10: {
    id: 'early_riser_10',
    name: '🌅 Mattiniero Seriale',
    description: 'Completa 10 percorsi prima delle 8:00',
    icon: '🌅'
  },
  mountain_king: {
    id: 'mountain_king',
    name: '🏔️ Re della Montagna',
    description: 'Supera 5000m di dislivello totale',
    icon: '🏔️'
  }
}

// Definizione livelli
const LEVELS = [
  { level: 1, name: 'Novizio', minKm: 0, maxKm: 25, icon: '🥉' },
  { level: 2, name: 'Escursionista', minKm: 25, maxKm: 100, icon: '🥈' },
  { level: 3, name: 'Esperto', minKm: 100, maxKm: 250, icon: '🥇' },
  { level: 4, name: 'Maestro', minKm: 250, maxKm: 500, icon: '💎' },
  { level: 5, name: 'Leggenda', minKm: 500, maxKm: Infinity, icon: '👑' }
]

// Definizione pool sfide giornaliere - POOL ESPANSO CON 16 SFIDE
const DAILY_CHALLENGES_POOL = [
  // SFIDE ORIGINALI (8)
  {
    id: 'distance_5km',
    name: 'Macinakm',
    description: 'Percorri almeno 5 km oggi',
    icon: '📏',
    checkCompletion: (todayStats) => todayStats.distance >= 5
  },
  {
    id: 'elevation_200m',
    name: 'Scalatore',
    description: 'Supera 200m di dislivello oggi',
    icon: '⛰️',
    checkCompletion: (todayStats) => todayStats.elevation >= 200
  },
  {
    id: 'duration_30min',
    name: 'Resistenza',
    description: 'Cammina per almeno 30 minuti',
    icon: '⏱️',
    checkCompletion: (todayStats) => todayStats.duration >= 30
  },
  {
    id: 'complete_route',
    name: 'Finisher',
    description: 'Completa un percorso oggi',
    icon: '✅',
    checkCompletion: (todayStats) => todayStats.routesCompleted >= 1
  },
  {
    id: 'distance_10km',
    name: 'Lunga Distanza',
    description: 'Percorri almeno 10 km oggi',
    icon: '🎯',
    checkCompletion: (todayStats) => todayStats.distance >= 10
  },
  {
    id: 'elevation_500m',
    name: 'Montanaro',
    description: 'Supera 500m di dislivello oggi',
    icon: '🏔️',
    checkCompletion: (todayStats) => todayStats.elevation >= 500
  },
  {
    id: 'early_bird',
    name: 'Mattiniero',
    description: 'Completa un percorso prima delle 8:00',
    icon: '🌅',
    checkCompletion: (todayStats) => todayStats.earlyBird >= 1
  },
  {
    id: 'speed_challenge',
    name: 'Velocista',
    description: 'Completa un percorso sotto il tempo stimato',
    icon: '⚡',
    checkCompletion: (todayStats) => todayStats.underTime >= 1
  },
  
  // NUOVE SFIDE FASE 2 (8)
  {
    id: 'speed_avg_4kmh',
    name: 'Passo Spedito',
    description: 'Mantieni una velocità media di 4 km/h o superiore',
    icon: '🏃',
    checkCompletion: (todayStats) => todayStats.avgSpeed >= 4
  },
  {
    id: 'sprint_hiking',
    name: 'Sprint Hiking',
    description: 'Mantieni una velocità media superiore a 5 km/h',
    icon: '🏃‍♂️',
    checkCompletion: (todayStats) => todayStats.avgSpeed >= 5
  },
  {
    id: 'new_location',
    name: 'Esploratore',
    description: 'Visita una località mai visitata prima',
    icon: '🧭',
    checkCompletion: (todayStats) => todayStats.newLocations >= 1
  },
  {
    id: 'waypoints_5',
    name: 'Cacciatore di Waypoint',
    description: 'Passa attraverso almeno 5 waypoint oggi',
    icon: '📍',
    checkCompletion: (todayStats) => todayStats.waypointsVisited >= 5
  },
  {
    id: 'afternoon_hike',
    name: 'Pomeriggio Attivo',
    description: 'Completa un percorso tra le 14:00 e le 18:00',
    icon: '☀️',
    checkCompletion: (todayStats) => todayStats.afternoonHikes >= 1
  },
  {
    id: 'sunset_walker',
    name: 'Camminata al Tramonto',
    description: 'Completa un percorso dopo le 18:00',
    icon: '🌅',
    checkCompletion: (todayStats) => todayStats.eveningHikes >= 1
  },
  {
    id: 'combo_5km_200m',
    name: 'Sfida Completa',
    description: 'Percorri 5 km E supera 200m di dislivello',
    icon: '🎖️',
    checkCompletion: (todayStats) => 
      todayStats.distance >= 5 && todayStats.elevation >= 200
  },
  {
    id: 'double_route',
    name: 'Doppietta',
    description: 'Completa 2 percorsi in un giorno',
    icon: '✌️',
    checkCompletion: (todayStats) => todayStats.routesCompleted >= 2
  }
]

class AchievementsService {
  /**
   * Recupera gli achievements di un utente
   * Se non esistono, crea record iniziale
   */
  async getAchievements(userId) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        ACHIEVEMENTS_COLLECTION_ID,
        [Query.equal('userId', userId)]
      )

      if (response.documents.length === 0) {
        return await this.createInitialAchievements(userId)
      }

      const doc = response.documents[0]
      return {
        success: true,
        data: {
          ...doc,
          badgeUnlockedAt: doc.badgeUnlockedAt ? JSON.parse(doc.badgeUnlockedAt) : {},
          dailyChallenges: doc.dailyChallenges ? JSON.parse(doc.dailyChallenges) : []
        }
      }
    } catch (error) {
      logger.error('Error fetching achievements:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Crea record achievements iniziale per nuovo utente
   */
  async createInitialAchievements(userId) {
    try {
      const document = await databases.createDocument(
        DATABASE_ID,
        ACHIEVEMENTS_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          totalPoints: 0,
          currentLevel: 1,
          badgesEarned: [],
          badgeUnlockedAt: JSON.stringify({}),
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: null,
          dailyChallenges: JSON.stringify([]),
          completedChallenges: [],
          challengesLastReset: null,
          lastUpdated: new Date().toISOString()
        }
      )

      return {
        success: true,
        data: {
          ...document,
          badgeUnlockedAt: {},
          dailyChallenges: []
        }
      }
    } catch (error) {
      logger.error('Error creating achievements:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Calcola il livello basato sui km totali
   */
  calculateLevel(totalKm) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (totalKm >= LEVELS[i].minKm) {
        return LEVELS[i]
      }
    }
    return LEVELS[0]
  }

  /**
   * Calcola i punti totali
   */
  calculatePoints(stats, badgesCount) {
    const kmPoints = Math.round(stats.totalKm * 10)
    const elevationPoints = Math.round((stats.totalAscent / 100) * 5)
    const routePoints = stats.totalRoutes * 50
    const badgePoints = badgesCount * 100

    return kmPoints + elevationPoints + routePoints + badgePoints
  }

  /**
   * Aggiorna lo streak dell'utente
   * Ritorna oggetto con streak aggiornato e flag se è stato perso
   */
  updateStreak(lastActivityDate, currentStreak, longestStreak) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (!lastActivityDate) {
      // Prima attività
      return {
        currentStreak: 1,
        longestStreak: Math.max(1, longestStreak),
        streakLost: false
      }
    }

    const lastActivity = new Date(lastActivityDate)
    const lastActivityDay = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate())
    
    const daysDiff = Math.floor((today - lastActivityDay) / (1000 * 60 * 60 * 24))

    if (daysDiff === 0) {
      // Stessa giornata, streak non cambia
      return {
        currentStreak,
        longestStreak,
        streakLost: false
      }
    } else if (daysDiff === 1) {
      // Giorno consecutivo, incrementa streak
      const newStreak = currentStreak + 1
      return {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, longestStreak),
        streakLost: false
      }
    } else {
      // Streak perso
      return {
        currentStreak: 1,
        longestStreak,
        streakLost: true
      }
    }
  }

  /**
   * Genera 3 sfide giornaliere casuali
   */
  generateDailyChallenges() {
    const shuffled = [...DAILY_CHALLENGES_POOL].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3).map(challenge => ({
      ...challenge,
      progress: 0,
      completed: false
    }))
  }

  /**
   * Controlla se le sfide devono essere resettate (nuova giornata)
   */
  shouldResetChallenges(challengesLastReset) {
    if (!challengesLastReset) return true

    const lastReset = new Date(challengesLastReset)
    const now = new Date()
    
    const lastResetDay = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate())
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return today > lastResetDay
  }

  /**
   * Calcola statistiche del giorno corrente - VERSIONE AGGIORNATA
   * Ora include anche: avgSpeed, newLocations, waypointsVisited, afternoonHikes, eveningHikes
   */
  calculateTodayStats(routes, allRoutes = []) {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const todayRoutes = routes.filter(route => {
      const completedAt = new Date(route.completedAt || route.createdAt)
      return completedAt >= todayStart
    })

    // Statistiche base
    const totalDistance = todayRoutes.reduce((sum, r) => sum + (r.actualDistance || 0), 0)
    const totalElevation = todayRoutes.reduce((sum, r) => sum + (r.actualAscent || 0), 0)
    const totalDuration = todayRoutes.reduce((sum, r) => sum + (r.actualDuration || 0), 0) // in minuti
    const routesCompleted = todayRoutes.length

    // Calcolo velocità media (km/h)
    // avgSpeed = distanza totale (km) / durata totale (ore)
    const avgSpeed = totalDuration > 0 
      ? totalDistance / (totalDuration / 60) 
      : 0

    // Early bird (prima delle 8:00)
    const earlyBird = todayRoutes.filter(r => {
      const hour = new Date(r.completedAt || r.createdAt).getHours()
      return hour < 8
    }).length

    // Under time (completato sotto il tempo stimato)
    const underTime = todayRoutes.filter(r => {
      if (!r.actualDuration || !r.duration) return false
      return (r.actualDuration / r.duration) < 1
    }).length

    // Afternoon hikes (14:00 - 18:00)
    const afternoonHikes = todayRoutes.filter(r => {
      const hour = new Date(r.completedAt || r.createdAt).getHours()
      return hour >= 14 && hour < 18
    }).length

    // Evening hikes (dopo le 18:00)
    const eveningHikes = todayRoutes.filter(r => {
      const hour = new Date(r.completedAt || r.createdAt).getHours()
      return hour >= 18
    }).length

    // Waypoints visitati oggi
    const waypointsVisited = todayRoutes.reduce((sum, r) => {
      return sum + (r.waypointsCompleted || 0)
    }, 0)

    // Nuove località visitate
    // Estraiamo località uniche di oggi
    const todayLocations = new Set()
    todayRoutes.forEach(r => {
      if (r.startLocation) {
        todayLocations.add(r.startLocation)
      }
    })

    // Estraiamo località visitate in passato (prima di oggi)
    const pastLocations = new Set()
    allRoutes.forEach(r => {
      const routeDate = new Date(r.completedAt || r.createdAt)
      if (routeDate < todayStart && r.startLocation) {
        pastLocations.add(r.startLocation)
      }
    })

    // Contiamo quante località di oggi sono nuove
    let newLocations = 0
    todayLocations.forEach(loc => {
      if (!pastLocations.has(loc)) {
        newLocations++
      }
    })

    return {
      distance: totalDistance,
      elevation: totalElevation,
      duration: totalDuration,
      routesCompleted,
      earlyBird,
      underTime,
      avgSpeed: parseFloat(avgSpeed.toFixed(2)),
      afternoonHikes,
      eveningHikes,
      waypointsVisited,
      newLocations
    }
  }

  /**
   * Aggiorna progresso sfide giornaliere
   */
  updateChallengesProgress(challenges, todayStats) {
    return challenges.map(challenge => {
      const challengeDef = DAILY_CHALLENGES_POOL.find(c => c.id === challenge.id)
      if (!challengeDef) return challenge

      const completed = challengeDef.checkCompletion(todayStats)
      
      return {
        ...challenge,
        completed,
        progress: completed ? 100 : 0
      }
    })
  }

  /**
   * Controlla quali nuovi badge sono stati sbloccati
   */
  checkNewBadges(currentBadges, stats, routes, currentStreak, longestStreak) {
    const newBadges = []

    // Badge originali Fase 1
    if (!currentBadges.includes('first_hike') && stats.totalRoutes >= 1) {
      newBadges.push('first_hike')
    }

    if (!currentBadges.includes('marathon') && stats.totalKm >= 42) {
      newBadges.push('marathon')
    }

    if (!currentBadges.includes('climber') && stats.totalAscent >= 1000) {
      newBadges.push('climber')
    }

    if (!currentBadges.includes('explorer') && stats.totalRoutes >= 10) {
      newBadges.push('explorer')
    }

    if (!currentBadges.includes('speedster')) {
      const hasFastRoute = routes.some(route => {
        if (!route.actualDuration || !route.duration) return false
        const percentage = (route.actualDuration / route.duration) * 100
        return percentage < 80
      })
      if (hasFastRoute) {
        newBadges.push('speedster')
      }
    }

    // NUOVI BADGE FASE 2
    
    // Badge Streak
    if (!currentBadges.includes('streak_7') && currentStreak >= 7) {
      newBadges.push('streak_7')
    }

    if (!currentBadges.includes('streak_30') && currentStreak >= 30) {
      newBadges.push('streak_30')
    }

    // Badge Fulmine (3 percorsi in un giorno)
    if (!currentBadges.includes('triple_day')) {
      const routesByDay = {}
      routes.forEach(route => {
        const date = new Date(route.completedAt || route.createdAt)
        const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        routesByDay[dayKey] = (routesByDay[dayKey] || 0) + 1
      })
      const hasTripleDay = Object.values(routesByDay).some(count => count >= 3)
      if (hasTripleDay) {
        newBadges.push('triple_day')
      }
    }

    // Badge Mattiniero Seriale (10 percorsi prima delle 8:00)
    if (!currentBadges.includes('early_riser_10')) {
      const earlyRoutes = routes.filter(route => {
        const hour = new Date(route.completedAt || route.createdAt).getHours()
        return hour < 8
      })
      if (earlyRoutes.length >= 10) {
        newBadges.push('early_riser_10')
      }
    }

    // Badge Re della Montagna (5000m dislivello)
    if (!currentBadges.includes('mountain_king') && stats.totalAscent >= 5000) {
      newBadges.push('mountain_king')
    }

    return newBadges
  }

  /**
   * Aggiorna gli achievements dell'utente
   * Chiamato dopo il completamento di un percorso
   */
  async updateAchievements(userId, stats, routes) {
    try {
      const achievementsResult = await this.getAchievements(userId)
      if (!achievementsResult.success) {
        return achievementsResult
      }

      const current = achievementsResult.data
      
      // Aggiorna streak
      const streakUpdate = this.updateStreak(
        current.lastActivityDate,
        current.currentStreak || 0,
        current.longestStreak || 0
      )

      // Controlla e resetta sfide giornaliere se necessario
      let dailyChallenges = current.dailyChallenges || []
      let completedChallenges = current.completedChallenges || []
      
      if (this.shouldResetChallenges(current.challengesLastReset)) {
        dailyChallenges = this.generateDailyChallenges()
        completedChallenges = []
      }

      // Calcola stats di oggi - PASSA TUTTE LE ROUTES per calcolo newLocations
      const todayStats = this.calculateTodayStats(routes, routes)
      
      // Aggiorna progresso sfide
      dailyChallenges = this.updateChallengesProgress(dailyChallenges, todayStats)
      
      // Aggiungi sfide completate oggi a completedChallenges
      const newlyCompleted = dailyChallenges
        .filter(c => c.completed && !completedChallenges.includes(c.id))
        .map(c => c.id)
      
      completedChallenges = [...completedChallenges, ...newlyCompleted]

      // Controlla badge (inclusi badge streak)
      const newBadges = this.checkNewBadges(
        current.badgesEarned || [],
        stats,
        routes,
        streakUpdate.currentStreak,
        streakUpdate.longestStreak
      )
      const allBadges = [...(current.badgesEarned || []), ...newBadges]
      
      // Aggiorna timestamp badge sbloccati
      const badgeUnlockedAt = current.badgeUnlockedAt || {}
      const now = new Date().toISOString()
      newBadges.forEach(badgeId => {
        badgeUnlockedAt[badgeId] = now
      })

      // Calcola nuovo livello
      const newLevel = this.calculateLevel(stats.totalKm)
      
      // Calcola punti totali
      const totalPoints = this.calculatePoints(stats, allBadges.length)

      // Aggiorna documento
      const updated = await databases.updateDocument(
        DATABASE_ID,
        ACHIEVEMENTS_COLLECTION_ID,
        current.$id,
        {
          totalPoints,
          currentLevel: newLevel.level,
          badgesEarned: allBadges,
          badgeUnlockedAt: JSON.stringify(badgeUnlockedAt),
          currentStreak: streakUpdate.currentStreak,
          longestStreak: streakUpdate.longestStreak,
          lastActivityDate: now,
          dailyChallenges: JSON.stringify(dailyChallenges),
          completedChallenges,
          challengesLastReset: dailyChallenges.length > 0 
            ? (current.challengesLastReset || now) 
            : now,
          lastUpdated: now
        }
      )

      return {
        success: true,
        data: {
          ...updated,
          badgeUnlockedAt: JSON.parse(updated.badgeUnlockedAt),
          dailyChallenges: JSON.parse(updated.dailyChallenges),
          newBadges,
          leveledUp: newLevel.level > current.currentLevel,
          streakLost: streakUpdate.streakLost,
          newStreak: streakUpdate.currentStreak,
          challengesCompleted: newlyCompleted
        }
      }
    } catch (error) {
      logger.error('Error updating achievements:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Resetta completamente gli achievements di un utente
   */
  async resetAchievements(userId) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        ACHIEVEMENTS_COLLECTION_ID,
        [Query.equal('userId', userId)]
      )

      if (response.documents.length === 0) {
        return { success: true }
      }

      const achievementDoc = response.documents[0]

      await databases.updateDocument(
        DATABASE_ID,
        ACHIEVEMENTS_COLLECTION_ID,
        achievementDoc.$id,
        {
          totalPoints: 0,
          currentLevel: 1,
          badgesEarned: [],
          badgeUnlockedAt: JSON.stringify({}),
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: null,
          dailyChallenges: JSON.stringify([]),
          completedChallenges: [],
          challengesLastReset: null,
          lastUpdated: new Date().toISOString()
        }
      )

      return { success: true }
    } catch (error) {
      logger.error('Error resetting achievements:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Ottieni tutti i badge disponibili
   */
  getAllBadges() {
    return BADGES
  }

  /**
   * Ottieni info su un badge specifico
   */
  getBadgeInfo(badgeId) {
    return BADGES[badgeId] || null
  }

  /**
   * Ottieni info su un livello specifico
   */
  getLevelInfo(level) {
    return LEVELS.find(l => l.level === level) || LEVELS[0]
  }

  /**
   * Ottieni tutti i livelli
   */
  getAllLevels() {
    return LEVELS
  }

  /**
   * Ottieni tutte le sfide disponibili nel pool
   */
  getAllChallenges() {
    return DAILY_CHALLENGES_POOL
  }
}

export default new AchievementsService()