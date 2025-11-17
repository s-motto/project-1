import { useState, useCallback } from 'react'
import routesService from '../services/routesService'
import logger from '../utils/logger'

/**
 * Custom hook per gestire il salvataggio del tracking GPS
 * Gestisce: salvataggio percorso iniziale, salvataggio dati completati, achievements
 * 
 * @param {Object} params - Parametri dell'hook
 * @param {Object} params.route - Dati del percorso originale
 * @param {Object} params.user - Utente corrente (da AuthContext)
 * @param {Object} params.trackingData - Dati del tracking: {distance, elapsedTime, elevationGain, elevationLoss, trackPoints}
 * @param {Object} params.toast - Sistema notifiche toast
 * @param {Function} params.onComplete - Callback chiamato dopo salvataggio completato
 * @returns {Object} { isSaving, savedRouteId, ensureRouteSaved, saveCompletedTracking }
 * 
 * @example
 * const { isSaving, savedRouteId, ensureRouteSaved, saveCompletedTracking } = useTrackingSave({
 *   route,
 *   user,
 *   trackingData: { distance, elapsedTime, elevationGain, elevationLoss, trackPoints },
 *   toast,
 *   onComplete: () => onClose()
 * })
 * 
 * // All'avvio del tracking
 * await ensureRouteSaved()
 * 
 * // Al termine del tracking
 * await saveCompletedTracking()
 */
export function useTrackingSave({ route, user, trackingData, toast, onComplete }) {
  // Stati per tracking salvataggio
  const [isSaving, setIsSaving] = useState(false)
  const [savedRouteId, setSavedRouteId] = useState(route.savedId || null)

  /**
   * Assicura che il percorso sia salvato su Appwrite
   * Se non esiste, lo crea automaticamente
   * Chiamato all'avvio del tracking
   * 
   * @returns {Promise<string>} ID del percorso salvato
   * @throws {Error} Se il salvataggio fallisce
   */
  const ensureRouteSaved = useCallback(async () => {
    // Se già salvato, ritorna l'ID esistente
    if (savedRouteId) {
      return savedRouteId
    }

    try {
      // Salva il percorso su Appwrite
      const result = await routesService.saveRoute(
        {
          name: route.name || 'Percorso tracciato',
          startPoint: route.startPoint,
          endPoint: route.endPoint,
          distance: route.distance,
          duration: route.duration,
          ascent: route.ascent || 0,
          descent: route.descent || 0,
          coordinates: route.coordinates,
          instructions: Array.isArray(route.instructions) ? route.instructions : []
        },
        user.$id
      )

      if (result.success) {
        setSavedRouteId(result.data.$id)
        return result.data.$id
      } else {
        throw new Error('Impossibile salvare il percorso')
      }
    } catch (error) {
      logger.error('Error in ensureRouteSaved:', error)
      throw error
    }
  }, [savedRouteId, route, user])

  /**
   * Salva i dati del tracking completato e aggiorna achievements
   * Chiamato quando l'utente termina il tracking
   * 
   * Operazioni eseguite:
   * 1. Assicura che il percorso sia salvato
   * 2. Aggiorna il percorso con i dati reali (actualDistance, actualDuration, ecc.)
   * 3. Aggiorna achievements, badges, streaks
   * 4. Mostra notifiche per achievements sbloccati
   * 5. Chiama callback onComplete
   * 
   * @returns {Promise<boolean>} true se salvataggio riuscito
   */
  const saveCompletedTracking = useCallback(async () => {
    setIsSaving(true)

    try {
      // 1. Assicura che il percorso sia salvato
      const routeId = await ensureRouteSaved()

      // 2. Prepara dati da salvare
      const completedData = {
        status: 'completed',
        completedAt: new Date().toISOString(),
        actualDistance: parseFloat(trackingData.distance.toFixed(2)),
        actualDuration: Math.floor(trackingData.elapsedTime / 60), // Converti in minuti
        actualAscent: trackingData.elevationGain,
        actualDescent: trackingData.elevationLoss,
        actualCoordinates: JSON.stringify(trackingData.trackPoints)
      }

      // 3. Aggiorna il percorso su Appwrite
      const result = await routesService.updateRoute(routeId, completedData)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast.success('Percorso completato e salvato!')

      // 4. Aggiorna achievements e gamification
      try {
        await updateAchievementsAfterTracking(user.$id, toast)
      } catch (achievementError) {
        // Achievements non bloccano il salvataggio principale
        logger.error('Error updating achievements:', achievementError)
      }

      // 5. Callback finale
      if (onComplete) {
        onComplete(result.data)
      }

      setIsSaving(false)
      return true
    } catch (error) {
      logger.error('Error saving completed tracking:', error)
      toast.error('Errore nel salvare il percorso: ' + error.message)
      setIsSaving(false)
      return false
    }
  }, [ensureRouteSaved, trackingData, user, toast, onComplete])

  return {
    isSaving,
    savedRouteId,
    ensureRouteSaved,
    saveCompletedTracking
  }
}

/**
 * Funzione helper per aggiornare achievements dopo il tracking
 * Gestisce: badges, livelli, streaks, sfide giornaliere
 * 
 * @param {string} userId - ID utente
 * @param {Object} toast - Sistema notifiche
 */
async function updateAchievementsAfterTracking(userId, toast) {
  try {
    // Carica percorsi completati aggiornati
    const completedRoutes = await routesService.getCompletedRoutes(userId)
    
    if (!completedRoutes.success) {
      throw new Error('Impossibile caricare percorsi completati')
    }

    // Import dinamici dei servizi (solo quando necessario)
    const [statsService, achievementsService] = await Promise.all([
      import('../services/statsService').then(m => m.default),
      import('../services/achievementsService').then(m => m.default)
    ])

    // Calcola nuove statistiche
    const stats = statsService.calculateStats(completedRoutes.data)

    // Aggiorna achievements
    const achievementResult = await achievementsService.updateAchievements(
      userId,
      stats,
      completedRoutes.data
    )

    if (!achievementResult.success) {
      throw new Error('Errore aggiornamento achievements')
    }

    const { newBadges, leveledUp, currentLevel, streakLost, newStreak, challengesCompleted } = achievementResult.data

    // 🏆 Notifiche badges sbloccati
    if (newBadges && newBadges.length > 0) {
      newBadges.forEach(badgeId => {
        const badge = achievementsService.getBadgeInfo(badgeId)
        if (badge) {
          toast.success(`🏆 Badge sbloccato: ${badge.name}!`)
        }
      })
    }

    // 🎉 Notifica level up
    if (leveledUp) {
      const levelInfo = achievementsService.getLevelInfo(currentLevel)
      if (levelInfo) {
        toast.success(`🎉 Livello ${levelInfo.level}: ${levelInfo.name}!`)
      }
    }

    // 🔥 Notifiche streak
    if (streakLost) {
      toast.error('💔 Streak perso! Riparti da oggi!')
    } else if (newStreak > 1) {
      toast.success(`🔥 Streak: ${newStreak} giorni consecutivi!`)
    }

    // 🎯 Notifiche sfide completate
    if (challengesCompleted && challengesCompleted.length > 0) {
      const challenges = achievementsService.getAllChallenges()
      challengesCompleted.forEach(challengeId => {
        const challenge = challenges.find(c => c.id === challengeId)
        if (challenge) {
          toast.success(`🎯 Sfida completata: ${challenge.name}!`)
        }
      })
    }
  } catch (error) {
    logger.error('Error in updateAchievementsAfterTracking:', error)
    // Non propagare l'errore - achievements non sono critici
  }
}

export default useTrackingSave