import React, { useState, useEffect } from 'react'
import { FaTimes, FaTrophy, FaStar, FaLock, FaSpinner } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import achievementsService from '../services/achievementsService'
import logger from '../utils/logger'

const Achievements = ({ onClose, stats }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [achievements, setAchievements] = useState(null)

  useEffect(() => {
    loadAchievements()
  }, [user])

  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  const loadAchievements = async () => {
    if (!user) return
    
    setLoading(true)
    const result = await achievementsService.getAchievements(user.$id)
    
    if (result.success) {
      setAchievements(result.data)
    } else {
      logger.error('Error loading achievements:', result.error)
    }
    
    setLoading(false)
  }

  const currentLevelInfo = achievements 
    ? achievementsService.getLevelInfo(achievements.currentLevel)
    : null

  const getProgressToNextLevel = () => {
    if (!currentLevelInfo || !stats) return { percentage: 0, current: 0, target: 0 }
    
    const currentKm = stats.totalKm
    const nextLevel = achievementsService.getLevelInfo(achievements.currentLevel + 1)
    
    if (!nextLevel || currentLevelInfo.level === 5) {
      return { percentage: 100, current: currentKm, target: currentKm, isMaxLevel: true }
    }

    const progress = currentKm - currentLevelInfo.minKm
    const total = nextLevel.minKm - currentLevelInfo.minKm
    const percentage = Math.min((progress / total) * 100, 100)

    return {
      percentage: Math.round(percentage),
      current: currentKm.toFixed(1),
      target: nextLevel.minKm,
      isMaxLevel: false
    }
  }

  const getAllBadgesWithStatus = () => {
    const allBadges = achievementsService.getAllBadges()
    const earnedBadges = achievements?.badgesEarned || []
    const unlockedAt = achievements?.badgeUnlockedAt || {}

    return Object.values(allBadges).map(badge => ({
      ...badge,
      isUnlocked: earnedBadges.includes(badge.id),
      unlockedDate: unlockedAt[badge.id] || null
    }))
  }

  const progress = getProgressToNextLevel()
  const badgesWithStatus = getAllBadgesWithStatus()
  const unlockedCount = badgesWithStatus.filter(b => b.isUnlocked).length
  const totalBadges = badgesWithStatus.length

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-xl">
        {/* Header */}
        <div className="modal-header-primary">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FaTrophy />
              I Tuoi Traguardi
            </h2>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="modal-body">
          {loading ? (
            <div className="text-center py-12">
              <FaSpinner className="spinner text-4xl mx-auto mb-4" />
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm">Caricamento...</p>
            </div>
          ) : !achievements ? (
            <div className="text-center py-12">
              <FaTrophy className="text-6xl text-gray-300 mx-auto mb-4" />
              <p style={{ color: 'var(--text-primary)' }} className="text-base mb-2">
                Errore caricamento traguardi
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sezione Livello */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Livello {currentLevelInfo?.level}
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {currentLevelInfo?.icon} {currentLevelInfo?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Punti Totali
                    </div>
                    <div className="text-xl font-bold text-yellow-500 flex items-center justify-end gap-1">
                      <FaStar />
                      {achievements.totalPoints}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                {!progress.isMaxLevel ? (
                  <>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${progress.percentage}%`,
                          background: 'linear-gradient(90deg, var(--gradient-start), var(--gradient-end))'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>{progress.current} km</span>
                      <span>{progress.percentage}%</span>
                      <span>{progress.target} km</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <span className="text-yellow-500 font-bold text-sm">
                      🎉 Hai raggiunto il livello massimo!
                    </span>
                  </div>
                )}
              </div>

              {/* Sezione Badge */}
              <div>
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Badge Sbloccati ({unlockedCount}/{totalBadges})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {badgesWithStatus.map(badge => (
                    <div
                      key={badge.id}
                      className={`card p-3 text-center transition-all ${
                        badge.isUnlocked 
                          ? 'border-2 border-green-500' 
                          : 'opacity-50 grayscale'
                      }`}
                    >
                      <div className="text-3xl mb-2">
                        {badge.isUnlocked ? badge.icon : <FaLock className="text-gray-400 mx-auto text-2xl" />}
                      </div>
                      <div 
                        className="font-semibold text-xs mb-1" 
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {badge.name}
                      </div>
                      <div 
                        className="text-xs leading-tight" 
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {badge.description}
                      </div>
                      {badge.isUnlocked && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ Sbloccato
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Punti */}
              <div className="card p-3" style={{ backgroundColor: 'var(--card-bg)' }}>
                <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                  💡 Come Guadagnare Punti
                </h4>
                <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <li>• 1 km percorso = 10 punti</li>
                  <li>• 100m dislivello = 5 punti</li>
                  <li>• Percorso completato = 50 punti</li>
                  <li>• Badge sbloccato = 100 punti</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Achievements