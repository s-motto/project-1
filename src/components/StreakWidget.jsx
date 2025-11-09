import React from 'react'
import { FaFire, FaTrophy } from 'react-icons/fa'

/**
 * Widget Streak - Mostra giorni consecutivi di attività
 * 
 * @param {Object} props
 * @param {Object} props.achievements - Dati achievements (currentStreak, longestStreak)
 * @param {Function} props.onClick - Callback quando si clicca sul widget
 */
const StreakWidget = ({ achievements, onClick }) => {
  if (!achievements) return null

  const { currentStreak = 0, longestStreak = 0 } = achievements
  const isStreakActive = currentStreak > 0

  return (
    <div
      onClick={onClick}
      className="card card-hover p-4 cursor-pointer transition-all"
      style={{
        background: isStreakActive
          ? 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)'
          : 'var(--bg-card)',
        border: isStreakActive ? 'none' : '2px solid var(--border-color)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-bold uppercase tracking-wide"
          style={{
            color: isStreakActive ? '#fff' : 'var(--text-primary)'
          }}
        >
          Streak
        </h3>
        <FaFire
          className="text-2xl"
          style={{
            color: isStreakActive ? '#FFE66D' : '#ccc'
          }}
        />
      </div>

      {/* Current Streak */}
      <div className="mb-2">
        <div
          className="text-3xl font-bold"
          style={{
            color: isStreakActive ? '#fff' : 'var(--text-primary)'
          }}
        >
          {currentStreak}{' '}
          <span className="text-base font-normal">
            {currentStreak === 1 ? 'giorno' : 'giorni'}
          </span>
        </div>
      </div>

      {/* Record */}
      <div className="flex items-center justify-between pt-2 border-t border-white/20">
        <span
          className="text-xs font-medium"
          style={{
            color: isStreakActive ? '#fff' : 'var(--text-secondary)',
            opacity: isStreakActive ? 0.9 : 0.7
          }}
        >
          <FaTrophy className="inline mr-1" />
          Record: {longestStreak} {longestStreak === 1 ? 'giorno' : 'giorni'}
        </span>
      </div>

      {/* Stato streak */}
      {!isStreakActive && currentStreak === 0 && (
        <div
          className="text-xs mt-2"
          style={{
            color: 'var(--text-secondary)',
            opacity: 0.7
          }}
        >
          💡 Completa un percorso per iniziare lo streak!
        </div>
      )}
    </div>
  )
}

export default StreakWidget