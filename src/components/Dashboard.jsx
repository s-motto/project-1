import React, { useState, useEffect } from 'react'
import { FaChartLine, FaRoute, FaClock, FaMountain, FaSpinner, FaTimes } from 'react-icons/fa'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import routesService from '../services/routesService'
import statsService from '../services/statsService'
import StatsCard from './StatsCard'

// Componente Dashboard per visualizzare le statistiche dell'utente
const Dashboard = ({ onClose }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [routes, setRoutes] = useState([])

  // Gestisce il blur della mappa quando la modale è aperta
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // Carica i percorsi completati  e calcola le statistiche
  const loadData = async () => {
    setLoading(true)
    //Usa getCompletedRoutes invece di getUserRoutes
    const result = await routesService.getCompletedRoutes(user.$id)
    
    if (result.success) {
      const completedRoutes = result.data
      setRoutes(completedRoutes)
      
      // Calcola statistiche dai percorsi completati
      const calculatedStats = statsService.calculateStats(completedRoutes)
      setStats(calculatedStats)
    }
    
    setLoading(false)
  }

  // Tooltip personalizzato per il grafico
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="dashboard-tooltip">
          <p className="dashboard-tooltip-label">{payload[0].payload.month}</p>
          <p className="dashboard-tooltip-value">
            {payload[0].value.toFixed(1)} km
          </p>
        </div>
      )
    }
    return null
  }

  // Se l'utente non è autenticato, mostro un messaggio di login
  if (!user) {
    return (
      <div className="modal-overlay">
        <div className="modal-content max-w-md">
          <div className="modal-header-primary">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <button onClick={onClose} className="modal-close-btn">
                <FaTimes />
              </button>
            </div>
          </div>
          <div className="modal-body text-center">
            <p className="text-gray-600">Effettua il login per vedere le tue statistiche</p>
          </div>
        </div>
      </div>
    )
  }

  // Render del componente Dashboard
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-3xl">
        {/* Header */}
        <div className="modal-header-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaChartLine className="text-3xl" />
              <div>
                <h2 className="text-2xl font-bold">Le tue statistiche</h2>
                <p className="text-sm text-blue-100">Progressi e traguardi raggiunti</p>
              </div>
            </div>
            <button onClick={onClose} className="modal-close-btn" aria-label="Chiudi">
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FaSpinner className="animate-spin text-4xl text-blue-600 mb-4" />
              <p className="text-gray-600">Caricamento statistiche...</p>
            </div>
          ) : !stats || stats.totalRoutes === 0 ? (
            <div className="text-center py-12">
              <FaRoute className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">Nessuna statistica disponibile</p>
              <p className="text-gray-500 text-sm">
                Completa i tuoi percorsi per vedere i progressi!
              </p>
            </div>
          ) : (
            <>
              {/* Cards Statistiche */}
              <div className="dashboard-stats-section">
                <h3 className="dashboard-section-title">📊 Riepilogo generale</h3>
                <div className="dashboard-stats-grid">
                  <StatsCard
                    icon={<FaRoute />}
                    label="Percorsi completati"
                    value={stats.totalRoutes.toString()}
                    color="text-green-600"
                  />
                  <StatsCard
                    icon={<FaChartLine />}
                    label="Chilometri totali"
                    value={statsService.formatKm(stats.totalKm)}
                    color="text-blue-600"
                  />
                  <StatsCard
                    icon={<FaClock />}
                    label="Tempo totale"
                    value={statsService.formatTime(stats.totalTime)}
                    color="text-purple-600"
                  />
                  <StatsCard
                    icon={<FaMountain />}
                    label="Dislivello totale"
                    value={statsService.formatMeters(stats.totalAscent)}
                    color="text-orange-600"
                  />
                </div>
              </div>

              {/* Grafico km per mese */}
              <div className="dashboard-chart-section">
                <h3 className="dashboard-section-title">📈 Km percorsi per mese</h3>
                <div className="dashboard-chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                      data={stats.monthlyKm}
                      margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFECCA" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#5E565A"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#5E565A"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'km', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="km"
                        stroke="#A9CBB7"
                        strokeWidth={3}
                        dot={{ fill: '#A9CBB7', r: 5 }}
                        activeDot={{ r: 7, fill: '#FF934F' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Messaggio se non ci sono dati nel grafico */}
                {stats.monthlyKm.every(m => m.km === 0) && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Nessun dato disponibile per gli ultimi 6 mesi
                  </p>
                )}
              </div>

              {/* Footer con info */}
              <div className="dashboard-footer">
                <p className="text-xs text-gray-500 text-center">
                  💡 Le statistiche sono calcolate dai percorsi che hai completato
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard