import React, { useState, useEffect } from 'react' // importo React e gli hook necessari
import { FaChartLine, FaRoute, FaClock, FaMountain, FaSpinner, FaTimes } from 'react-icons/fa'  // importo le icone necessarie
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts' // importo i componenti del grafico
import { useAuth } from '../contexts/AuthContext' // importo il contesto di autenticazione
import routesService from '../services/routesService' // importo il servizio per le rotte
import statsService from '../services/statsService' // importo il servizio per le statistiche
import { useSettings } from '../contexts/SettingsContext' // importo il contesto delle impostazioni
import { formatDistance, formatElevation, KM_TO_MI, formatDurationMinutes, formatTimestamp, formatTimestampForFilename } from '../utils/gpsUtils' // importo le funzioni di utilità
import StatsCard from './StatsCard' // importo il componente StatsCard
import { generateGpxFromTrack } from '../utils/gpx' // importo la funzione per generare GPX
import { trackToPng } from '../utils/trackImage'  // importo la funzione per generare immagini del percorso

// Componente Dashboard per visualizzare le statistiche dell'utente
const Dashboard = ({ onClose }) => {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [routes, setRoutes] = useState([])

  // Gestisce l'esportazione del file GPX
  const handleExportGpx = (route) => {
    const name = route.name || 'Percorso'
    let points = [] 
    // Determina le coordinate da usare
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
    const gpx = generateGpxFromTrack(name, points)  // Genera il contenuto GPX
    const blob = new Blob([gpx], { type: 'application/gpx+xml' })   // Crea il blob, ossia il file virtuale
    const url = URL.createObjectURL(blob) // Crea l'URL per il download
    const a = document.createElement('a') // Crea un elemento di ancoraggio
    const dateStr = formatTimestampForFilename(route.completedAt || new Date().toISOString(), settings?.timeFormat || '24h')  // Formatta la data per il nome del file
    a.href = url // Imposta l'URL come href
    a.download = `${name.replace(/\s+/g, '_')}_${dateStr}.gpx`  // Imposta il nome del file
    document.body.appendChild(a)  // Aggiunge l'elemento al DOM
    a.click() // Simula il click per avviare il download
    a.remove()  // Rimuove l'elemento
    URL.revokeObjectURL(url)  // Revoca l'URL per liberare memoria
  }

  // Gestisce l'esportazione dell'immagine del percorso
  const handleExportImage = async (route) => {
    const name = route.name || 'Percorso'
    let points = []   
    if (Array.isArray(route.actualCoordinates) && route.actualCoordinates.length > 0) { // Usa le coordinate effettive se disponibili
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
    // Let the exporter choose a reliable default style (streets-v2). Also pass OSM tile template fallback (no key required).
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

  // Gestisce il blur della mappa quando la modale è aperta
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  // Carica i dati quando l'utente cambia
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // Carica i percorsi completati e calcola le statistiche
  const loadData = async () => {
    setLoading(true)
    //  Carica i percorsi completati
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
            {settings?.distanceUnit === 'mi'
              ? `${(payload[0].value * KM_TO_MI).toFixed(1)} mi`
              : `${payload[0].value.toFixed(1)} km`}
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
            <p style={{ color: 'var(--text-secondary)' }}>Effettua il login per vedere le tue statistiche</p>
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
                      ? (() => { const mi = stats.totalKm * KM_TO_MI; return mi >= 1000 ? `${(mi/1000).toFixed(1)}k mi` : `${mi.toFixed(1)} mi` })()
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
                
                {/* Messaggio se non ci sono dati nel grafico */}
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
    </div>
  )
}

export default Dashboard