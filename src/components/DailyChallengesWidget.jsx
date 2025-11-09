import React from 'react'
import { FaCheckCircle, FaClock } from 'react-icons/fa'

/**
 * Widget Sfide Giornaliere - Mostra 3 sfide del giorno con progress
 * 
 * @param {Object} props
 * @param {Object} props.stats - Statistiche utente (totalKm, totalAscent, ecc.)
 * @param {Object} props.achievements - Dati achievements
 */
const DailyChallengesWidget = ({ stats, achievements }) => {
  if (!stats) return null

  // Definizione delle 3 sfide giornaliere (per ora fisse, poi le renderemo dinamiche)
  const challenges = [
    {
      id: 'daily_km',
      icon: '🚶',
      title: 'Percorri 5 km oggi',
      target: 5,
      current: stats.totalKm, // In futuro useremo stats del giorno corrente
      unit: 'km'
    },
    {
      id: 'daily_elevation',
      icon: '⛰️',
      title: 'Supera 200m di dislivello',
      target: 200,
      current: stats.totalAscent, // In futuro useremo stats del giorno corrente
      unit: 'm'
    },
    {
      id: 'daily_route',
      icon: '🆕',
      title: 'Completa un nuovo sentiero',
      target: 1,
      current: stats.totalRoutes, // In futuro useremo routes del giorno corrente
      unit: 'percorso'
    }
  ]

  // Calcola progresso per ogni sfida
  const getChallengeProgress = (challenge) => {
    const percentage = Math.min((challenge.current / challenge.target) * 100, 100)
    const isCompleted = percentage >= 100

    return {
      percentage: Math.round(percentage),
      isCompleted,
      currentFormatted: challenge.current >= 1000 
        ? `${(challenge.current / 1000).toFixed(1)}k` 
        : challenge.current.toFixed(challenge.unit === 'km' ? 1 : 0),
      targetFormatted: challenge.target >= 1000
        ? `${(challenge.target / 1000).toFixed(1)}k`
        : challenge.target
    }
  }

  return (
    <div
      className="card p-4"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '2px solid var(--border-color)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-base font-bold flex items-center gap-2"
          style={{ color: 'var(--text-primary)' }}
        >
          🎯 Sfide del Giorno
        </h3>
        <div
          className="text-xs flex items-center gap-1"
          style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
        >
          <FaClock className="text-xs" />
          <span>Reset a mezzanotte</span>
        </div>
      </div>

      {/* Lista Sfide */}
      <div className="space-y-3">
        {challenges.map(challenge => {
          const progress = getChallengeProgress(challenge)

          return (
            <div key={challenge.id}>
              {/* Titolo Sfida */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{challenge.icon}</span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: progress.isCompleted
                        ? 'var(--color-green)'
                        : 'var(--text-primary)'
                    }}
                  >
                    {challenge.title}
                  </span>
                  {progress.isCompleted && (
                    <FaCheckCircle
                      className="text-sm"
                      style={{ color: 'var(--color-green)' }}
                    />
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div
                  className="w-full rounded-full h-2"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${progress.percentage}%`,
                      backgroundColor: progress.isCompleted
                        ? 'var(--color-green)'
                        : '#FF934F'
                    }}
                  />
                </div>

                {/* Testo Progresso */}
                <div
                  className="flex justify-between text-xs"
                  style={{ color: 'var(--text-secondary)', opacity: 0.7 }}
                >
                  <span>
                    {progress.currentFormatted} / {progress.targetFormatted} {challenge.unit}
                  </span>
                  <span className="font-semibold">{progress.percentage}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Info */}
      <div
        className="mt-4 pt-3 border-t text-xs text-center"
        style={{
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)',
          opacity: 0.7
        }}
      >
        💡 Completa tutte le sfide per guadagnare bonus punti!
      </div>
    </div>
  )
}

export default DailyChallengesWidget