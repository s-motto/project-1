import React, { useState, useEffect } from 'react'
import { FaChartLine, FaRoute, FaClock, FaMountain, FaSpinner, FaTimes } from 'react-icons/fa'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import routesService from '../services/routesService'
import statsService from '../services/statsService'
import achievementsService from '../services/achievementsService'
import { useSettings } from '../contexts/SettingsContext'
import { formatDistance, formatElevation, KM_TO_MI, formatDurationMinutes, formatTimestamp, formatTimestampForFilename } from '../utils/gpsUtils'
import StatsCard from './StatsCard'
import { generateGpxFromTrack } from '../utils/gpx'
import { trackToPng } from '../utils/trackImage'
import Achievements from './Achievements'

const Dashboard = ({ onClose }) => {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [routes, setRoutes] = useState([])
  const [showAchievements, setShowAchievements] = useState(false)

  const handleExportGpx = (route) => {
    const name = route.name || 'Percorso'
    let points = []
    if (Array.isArray(route.actualCoordinates) && route.actualCoordinates.length > 0) {
      points = route.actualCoordinates
    } else if (Array.isArray(route.coordinates)) {
      points = route.coordinates.map(c => {
        if (Array.isArray(c)) {
          return { lat: c[1], lng: c[0] }
        }
        return { lat: c.lat, lng: c.lng }
      })
    }
    const gpx = generateGpxFromTrack(name, points)
    const blob = new Blob([gpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = formatTimestampForFilename(route.completedAt || new Date().toISOString(), settings?.timeFormat || '24h')
    a.href = url
    a.download = `${name.replace(/\s+/g, '_')}_${dateStr}.gpx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportImage = async (route) => {
    const name = route.name || 'Percorso'
    let points = []
    if (Array.isArray(route.actualCoordinates) && route.actualCoordinates.length > 0) {
      points = route.actualCoordinates
    } else if (Array.isArray(route.coordinates)) {
      points = route.coordinates.map(c => {
        if (Array.isArray(c)) {
          return { lat: c[1], lng: c[0] }
        }
        return { lat: c.lat, lng: c.lng }
      })
    }
    const basemapKey = import.meta.env.VITE_MAPTILER_KEY
    const staticTileUrl = import.meta.env.VITE_STATIC_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    const tileAttribution = import.meta.env.VITE_TILE_ATTRIBUTION || '© OpenStreetMap contributors'
    const blob = await trackToPng(name, points, { width: 1600, height: 1000, basemapKey, staticTileUrl, tileAttribution })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = formatTimestampForFilename(route.completedAt || new Date().toISOString(), settings?.timeFormat || '24h')
    a.href = url
    a.download = `${name.replace(/\s+/g, '_')}_${dateStr}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!showAchievements) {
      document.body.classList.add('modal-open')
    }
    return () => {
      if (!showAchievements) {
        document.body.classList.remove('modal-open')
      }
    }
  }, [showAchievements])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    setLoading(true)
    const result = await routesService.getCompletedRoutes(user.$id)

    if (result.success) {
      const completedRoutes = result.data
      setRoutes(completedRoutes)

      const calculatedStats = statsService.calculateStats(completedRoutes)
      setStats(calculatedStats)
    }

    setLoading(false)
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="dashboard-tooltip">
          <p className="dashboard-tooltip-label">{payload[0].payload.month}</p>
          <p className="dashboard-tooltip-value">
            {settings?.distanceUnit === 'mi'
              ? `${(payload[0].value * KM_TO_MI).toFixed(1)} mi`
              : `${payload[0].value.toFixed(1)} km`}
          </p>
        </div>
      )
    }
    return null
  }

  if (!user) {
    return (
      <div className="modal-overlay">
        <div className="modal-content max-w-md">
          <div className="modal-header-primary">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                <FaTimes />
              </button>
            </div>
          </div>
          <div className="modal-body text-center">
            <p style={{ color: 'var(--text-secondary)' }}>Effettua il login per vedere le tue statistiche</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-3xl">
        {/* Header */}
 {/* Header */}
<div className="modal-header-primary">
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 min-w-0">
      <FaChartLine className="text-2xl flex-shrink-0" />
      <div className="min-w-0">
        <h2 className="text-xl font-bold truncate">Dashboard</h2>
      </div>
    </div>
    
    <div className="flex items-center gap-2 flex-shrink-0">
      <button 
        onClick={() => setShowAchievements(true)}
        className="bg-white/20 hover:bg-white/30 text-white text-sm px-2 py-1 rounded-lg transition-colors"
      >
        🏆
      </button>
      <button 
        onClick={onClose} 
        className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
      >
        <FaTimes className="text-xl" />
      </button>
    </div>
  </div>
</div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="text-center py-12">
              <FaSpinner className="spinner text-4xl mx-auto mb-4" />
              <p style={{ color: 'var(--text-secondary)' }}>Caricamento statistiche...</p>
            </div>
          ) : !stats || stats.totalRoutes === 0 ? (
            <div className="text-center py-12">
              <FaRoute className="text-6xl text-gray-300 mx-auto mb-4" />
              <p style={{ color: 'var(--text-primary)' }} className="text-lg mb-2">Nessuna statistica disponibile</p>
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
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
                    label={settings?.distanceUnit === 'mi' ? 'Miglia totali' : 'Chilometri totali'}
                    value={settings?.distanceUnit === 'mi'
                      ? (() => { const mi = stats.totalKm * KM_TO_MI; return mi >= 1000 ? `${(mi / 1000).toFixed(1)}k mi` : `${mi.toFixed(1)} mi` })()
                      : statsService.formatKm(stats.totalKm)}
                    color="text-blue-600"
                  />
                  <StatsCard
                    icon={<FaClock />}
                    label="Tempo totale"
                    value={formatDurationMinutes(stats.totalTime, settings?.durationFormat || 'hms')}
                    color="text-purple-600"
                  />
                  <StatsCard
                    icon={<FaMountain />}
                    label="Dislivello totale"
                    value={settings?.elevationUnit === 'ft'
                      ? `${Math.round(stats.totalAscent * 3.28084).toLocaleString('it-IT')} ft`
                      : statsService.formatMeters(stats.totalAscent)}
                    color="text-orange-600"
                  />
                </div>
              </div>

              {/* Grafico km per mese */}
              <div className="dashboard-chart-section">
                <h3 className="dashboard-section-title">📈 {settings?.distanceUnit === 'mi' ? 'Mi' : 'Km'} percorsi per mese</h3>
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
                        label={{ value: settings?.distanceUnit === 'mi' ? 'mi' : 'km', angle: -90, position: 'insideLeft' }}
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

                {stats.monthlyKm.every(m => m.km === 0) && (
                  <p className="text-center text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>
                    Nessun dato disponibile per gli ultimi 6 mesi
                  </p>
                )}
              </div>

              {/* Esporta GPX */}
              <div className="mt-6">
                <h3 className="dashboard-section-title">📤 Esporta GPX dei percorsi completati</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {routes.map(r => (
                    <div key={r.$id} className="flex items-center justify-between border rounded px-3 py-2" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="text-sm">
                        <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {formatTimestamp(r.completedAt || r.createdAt, settings?.timeFormat || '24h')} • {formatDistance(r.actualDistance ?? r.distance, settings?.distanceUnit || 'km')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <button
                          onClick={() => handleExportGpx(r)}
                          className="btn-primary px-2.5 py-1 text-sm rounded-md"
                          disabled={!(Array.isArray(r.actualCoordinates) && r.actualCoordinates.length > 1) && !(Array.isArray(r.coordinates) && r.coordinates.length > 1)}
                          title={Array.isArray(r.actualCoordinates) && r.actualCoordinates.length > 1 ? 'Esporta traccia GPX' : 'Esporta GPX del percorso pianificato'}
                        >
                          GPX
                        </button>
                        <button
                          onClick={() => handleExportImage(r)}
                          className="btn-primary px-2.5 py-1 text-sm rounded-md"
                          disabled={!(Array.isArray(r.actualCoordinates) && r.actualCoordinates.length > 1) && !(Array.isArray(r.coordinates) && r.coordinates.length > 1)}
                          title="Esporta immagine del percorso"
                        >
                          Immagine
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer con info */}
              <div className="dashboard-footer">
                <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                  💡 Le statistiche sono calcolate dai percorsi che hai completato
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modale Achievements */}
      {showAchievements && (
        <Achievements 
          onClose={() => setShowAchievements(false)}
          stats={stats}
        />
      )}
    </div>
  )
}

export default Dashboard