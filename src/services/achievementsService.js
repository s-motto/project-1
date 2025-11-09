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
        // Crea nuovo record per nuovo utente
        return await this.createInitialAchievements(userId)
      }

      const doc = response.documents[0]
      return {
        success: true,
        data: {
          ...doc,
          badgeUnlockedAt: doc.badgeUnlockedAt ? JSON.parse(doc.badgeUnlockedAt) : {}
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
          lastUpdated: new Date().toISOString()
        }
      )

      return {
        success: true,
        data: {
          ...document,
          badgeUnlockedAt: {}
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
   * 1 km = 10 punti
   * 100m dislivello = 5 punti
   * Percorso completato = 50 punti
   * Badge = 100 punti
   */
  calculatePoints(stats, badgesCount) {
    const kmPoints = Math.round(stats.totalKm * 10)
    const elevationPoints = Math.round((stats.totalAscent / 100) * 5)
    const routePoints = stats.totalRoutes * 50
    const badgePoints = badgesCount * 100

    return kmPoints + elevationPoints + routePoints + badgePoints
  }

  /**
   * Controlla quali nuovi badge sono stati sbloccati
   * Ritorna array di badge appena sbloccati
   */
  checkNewBadges(currentBadges, stats, routes) {
    const newBadges = []

    // Badge: Primi Passi (primo percorso)
    if (!currentBadges.includes('first_hike') && stats.totalRoutes >= 1) {
      newBadges.push('first_hike')
    }

    // Badge: Maratoneta (42+ km totali)
    if (!currentBadges.includes('marathon') && stats.totalKm >= 42) {
      newBadges.push('marathon')
    }

    // Badge: Scalatore (1000+ m dislivello)
    if (!currentBadges.includes('climber') && stats.totalAscent >= 1000) {
      newBadges.push('climber')
    }

    // Badge: Esploratore (10+ percorsi)
    if (!currentBadges.includes('explorer') && stats.totalRoutes >= 10) {
      newBadges.push('explorer')
    }

    // Badge: Velocista (almeno un percorso in <80% tempo stimato)
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

    return newBadges
  }

  /**
   * Aggiorna gli achievements dell'utente
   * Chiamato dopo il completamento di un percorso
   */
  async updateAchievements(userId, stats, routes) {
    try {
      // Recupera achievements attuali
      const achievementsResult = await this.getAchievements(userId)
      if (!achievementsResult.success) {
        return achievementsResult
      }

      const current = achievementsResult.data
      
      // Controlla nuovi badge
      const newBadges = this.checkNewBadges(current.badgesEarned || [], stats, routes)
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
          lastUpdated: now
        }
      )

      return {
        success: true,
        data: {
          ...updated,
          badgeUnlockedAt: JSON.parse(updated.badgeUnlockedAt),
          newBadges, // Badge appena sbloccati
          leveledUp: newLevel.level > current.currentLevel // true se salito di livello
        }
      }
    } catch (error) {
      logger.error('Error updating achievements:', error)
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
 * Resetta completamente gli achievements di un utente
 * Riporta tutto ai valori iniziali
 */
async resetAchievements(userId) {
  try {
    // Trova il documento achievements dell'utente
    const response = await databases.listDocuments(
      DATABASE_ID,
      ACHIEVEMENTS_COLLECTION_ID,
      [Query.equal('userId', userId)]
    )

    if (response.documents.length === 0) {
      return { success: true } // Niente da resettare
    }

    const achievementDoc = response.documents[0]

    // Resetta ai valori iniziali
    await databases.updateDocument(
      DATABASE_ID,
      ACHIEVEMENTS_COLLECTION_ID,
      achievementDoc.$id,
      {
        totalPoints: 0,
        currentLevel: 1,
        badgesEarned: [],
        badgeUnlockedAt: JSON.stringify({}),
        lastUpdated: new Date().toISOString()
      }
    )

    return { success: true }
  } catch (error) {
    logger.error('Error resetting achievements:', error)
    return { success: false, error: error.message }
  }
}
}

export default new AchievementsService()