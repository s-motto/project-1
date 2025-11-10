import React, { useState, useEffect } from 'react'
import { FaTimes, FaTrophy, FaStar, FaLock, FaSpinner, FaFire, FaCheckCircle, FaClock } from 'react-icons/fa'
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

  const currentStreak = achievements?.currentStreak || 0
  const longestStreak = achievements?.longestStreak || 0
  const isStreakActive = currentStreak > 0

  const dailyChallenges = achievements?.dailyChallenges || []
  const completedChallengesCount = dailyChallenges.filter(c => c.completed).length
  const allChallengesCompleted = dailyChallenges.length > 0 && completedChallengesCount === dailyChallenges.length

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-xl">
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

                {/* PROGRESS BAR FIXATA */}
                {!progress.isMaxLevel ? (
                  <>
                    <div 
                      className="w-full rounded-full h-2 mb-2 relative"
                      style={{ 
                        backgroundColor: '#e5e7eb',
                        overflow: 'hidden'
                      }}
                    >
                      <div 
                        className="h-full rounded-full transition-all duration-500 absolute top-0 left-0"
                        style={{ 
                          width: `${Math.max(progress.percentage, 0)}%`,
                          background: 'linear-gradient(90deg, #A9CBB7, #5A8370)',
                          minWidth: progress.percentage > 0 ? '4px' : '0'
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

              {/* Sezione Streak */}
              <div className="card p-4"
                style={{
                  background: isStreakActive
                    ? 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)'
                    : 'var(--bg-card)',
                  border: isStreakActive ? 'none' : '2px solid var(--border-color)'
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold" style={{ color: isStreakActive ? '#fff' : 'var(--text-primary)' }}>
                    🔥 Streak
                  </h3>
                  <FaFire className="text-2xl" style={{ color: isStreakActive ? '#FFE66D' : '#ccc' }} />
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold" style={{ color: isStreakActive ? '#fff' : 'var(--text-primary)' }}>
                    {currentStreak}
                  </span>
                  <span className="text-base" style={{ color: isStreakActive ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>
                    {currentStreak === 1 ? 'giorno consecutivo' : 'giorni consecutivi'}
                  </span>
                </div>

                <div className="pt-2 border-t" style={{ borderColor: isStreakActive ? 'rgba(255,255,255,0.2)' : 'var(--border-color)' }}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: isStreakActive ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)' }}>
                      🏆 Record personale
                    </span>
                    <span className="font-bold" style={{ color: isStreakActive ? '#FFE66D' : 'var(--text-primary)' }}>
                      {longestStreak} {longestStreak === 1 ? 'giorno' : 'giorni'}
                    </span>
                  </div>
                </div>

                {!isStreakActive && (
                  <div className="text-xs mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', opacity: 0.7 }}>
                    💡 Completa un percorso oggi per iniziare lo streak!
                  </div>
                )}
              </div>

              {/* SEZIONE SFIDE MIGLIORATA */}
              {dailyChallenges.length > 0 && (
                <div className="card p-4"
                  style={{
                    background: allChallengesCompleted
                      ? 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)'
                      : 'var(--bg-card)',
                    border: allChallengesCompleted ? 'none' : '2px solid var(--border-color)'
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold" style={{ color: allChallengesCompleted ? '#fff' : 'var(--text-primary)' }}>
                      🎯 Sfide del Giorno
                    </h3>
                    <div className="flex items-center gap-1 text-sm font-bold"
                      style={{ color: allChallengesCompleted ? '#FFE66D' : 'var(--color-green)' }}
                    >
                      {completedChallengesCount}/{dailyChallenges.length}
                      {allChallengesCompleted && <FaTrophy className="ml-1" />}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {dailyChallenges.map((challenge) => (
                      <div key={challenge.id} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {challenge.completed ? (
                            <FaCheckCircle className="text-lg" style={{ color: allChallengesCompleted ? '#FFE66D' : '#4CAF50' }} />
                          ) : (
                            <FaClock className="text-lg" style={{ color: allChallengesCompleted ? 'rgba(255,255,255,0.5)' : 'var(--text-secondary)', opacity: 0.5 }} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{challenge.icon}</span>
                            <span className="font-bold text-sm" style={{ color: allChallengesCompleted ? '#fff' : 'var(--text-primary)' }}>
                              {challenge.name}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: allChallengesCompleted ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)' }}>
                            {challenge.description}
                          </p>
                        </div>

                        {challenge.completed && (
                          <div className="flex-shrink-0">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                              style={{
                                backgroundColor: allChallengesCompleted ? 'rgba(255,230,109,0.3)' : 'rgba(76,175,80,0.2)',
                                color: allChallengesCompleted ? '#FFE66D' : '#4CAF50'
                              }}
                            >
                              ✓
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {allChallengesCompleted && (
                    <div className="text-xs mt-4 pt-3 border-t border-white/20 text-center font-bold" style={{ color: '#FFE66D' }}>
                      🎉 Tutte le sfide completate oggi!
                    </div>
                  )}
                </div>
              )}

              {/* Sezione Badge */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    🏆 Badge Sbloccati
                  </h3>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-green)' }}>
                    {unlockedCount}/{totalBadges}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {badgesWithStatus.map((badge) => (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-lg transition-all ${badge.isUnlocked ? 'card-hover' : ''}`}
                      style={{
                        backgroundColor: badge.isUnlocked ? 'var(--bg-card)' : 'var(--bg-secondary)',
                        border: `2px solid ${badge.isUnlocked ? 'var(--color-green)' : 'var(--border-color)'}`,
                        opacity: badge.isUnlocked ? 1 : 0.5
                      }}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">
                          {badge.isUnlocked ? badge.icon : <FaLock style={{ color: 'var(--text-secondary)' }} />}
                        </div>
                        <div className="text-xs font-bold mb-1" style={{ color: badge.isUnlocked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {badge.isUnlocked ? badge.name.split(' ').slice(1).join(' ') : '???'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                          {badge.isUnlocked ? badge.description : 'Badge bloccato'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Achievements