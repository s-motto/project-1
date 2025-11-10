import React from 'react'
import { FaCheckCircle, FaClock, FaTrophy } from 'react-icons/fa'

const DailyChallengesWidget = ({ achievements, onClick }) => {
  if (!achievements) return null

  const challenges = achievements.dailyChallenges || []
  if (challenges.length === 0) return null

  const completedCount = challenges.filter(c => c.completed).length
  const allCompleted = completedCount === challenges.length

  return (
    <div
      onClick={onClick}
      className="card card-hover p-4 cursor-pointer transition-all"
      style={{
        background: allCompleted
          ? 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)'
          : 'var(--bg-card)',
        border: allCompleted ? 'none' : '2px solid var(--border-color)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-bold uppercase tracking-wide"
          style={{
            color: allCompleted ? '#fff' : 'var(--text-primary)'
          }}
        >
          Sfide del Giorno
        </h3>
        <div
          className="flex items-center gap-1 text-sm font-bold"
          style={{
            color: allCompleted ? '#FFE66D' : 'var(--color-green)'
          }}
        >
          {completedCount}/{challenges.length}
          {allCompleted && <FaTrophy className="ml-1" />}
        </div>
      </div>

      {/* Lista Sfide */}
      <div className="space-y-3">
        {challenges.map((challenge) => (
          <div key={challenge.id} className="flex items-start gap-2">
            {/* Icona */}
            <div className="flex-shrink-0 mt-0.5">
              {challenge.completed ? (
                <FaCheckCircle
                  className="text-base"
                  style={{
                    color: allCompleted ? '#FFE66D' : '#4CAF50'
                  }}
                />
              ) : (
                <FaClock
                  className="text-base"
                  style={{
                    color: allCompleted ? 'rgba(255,255,255,0.5)' : 'var(--text-secondary)',
                    opacity: allCompleted ? 1 : 0.5
                  }}
                />
              )}
            </div>

            {/* Contenuto */}
            <div className="flex-1 min-w-0">
              <div
                className="text-xs font-medium mb-0.5 flex items-center gap-1.5"
                style={{
                  color: allCompleted ? '#fff' : 'var(--text-primary)',
                  opacity: challenge.completed ? 1 : 0.8
                }}
              >
                <span>{challenge.icon}</span>
                <span>{challenge.name}</span>
              </div>
              <div
                className="text-xs leading-snug"
                style={{
                  color: allCompleted ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
                  opacity: allCompleted ? 1 : 0.7
                }}
              >
                {challenge.description}
              </div>
            </div>

            {/* Checkmark */}
            {challenge.completed && (
              <div className="flex-shrink-0">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: allCompleted ? 'rgba(255,230,109,0.3)' : 'rgba(76,175,80,0.2)',
                    color: allCompleted ? '#FFE66D' : '#4CAF50'
                  }}
                >
                  ✓
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {allCompleted && (
        <div
          className="text-xs mt-3 pt-3 border-t border-white/20 text-center font-bold"
          style={{ color: '#FFE66D' }}
        >
          🎉 Tutte completate!
        </div>
      )}

      {completedCount === 0 && (
        <div
          className="text-xs mt-3 pt-3 border-t"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
            opacity: 0.7
          }}
        >
          💡 Completa percorsi per sbloccarle!
        </div>
      )}
    </div>
  )
}

export default DailyChallengesWidget
