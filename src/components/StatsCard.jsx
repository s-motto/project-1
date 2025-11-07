import React from 'react'

/**
 * Card riutilizzabile per visualizzare una statistica
 * @param {Object} props - Props del componente
 * @param {React.ReactNode} props.icon - Icona da mostrare
 * @param {string} props.label - Etichetta della statistica
 * @param {string} props.value - Valore della statistica
 * @param {string} props.color - Colore dell'icona 
 */
// Componente StatsCard per visualizzare una statistica
const StatsCard = ({ icon, label, value, color = 'text-blue-600' }) => {
  return (
    <div className="stats-card">
      <div className="stats-card-icon-container">
        <div className={`stats-card-icon ${color}`}>
          {icon}
        </div>
      </div>
      <div className="stats-card-content">
        <p className="stats-card-label">{label}</p>
        <p className="stats-card-value">{value}</p>
      </div>
    </div>
  )
}

export default StatsCard