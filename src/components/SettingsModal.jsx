import React, { useMemo, useState, useEffect } from 'react'
import { FaTimes, FaTrash, FaDownload, FaInfoCircle } from 'react-icons/fa'
import { useSettings } from '../contexts/SettingsContext'
import { useAuth } from '../contexts/AuthContext'
import routesService from '../services/routesService'

const SettingsModal = ({ onClose }) => {
  const { settings, setSettings } = useSettings()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)

  // Add body class to hide map controls/markers while modal is open
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  const handleChange = (patch) => setSettings({ ...settings, ...patch })

  const exportData = async () => {
    if (!user) return
    setBusy(true)
    try {
      const res = await routesService.getUserRoutes(user.$id)
      const payload = {
        exportedAt: new Date().toISOString(),
        user: { id: user.$id, name: user.name, email: user.email },
        settings,
        routes: res.success ? res.data : []
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lets-walk-export_${new Date().toISOString().slice(0,10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  const deleteAllRoutes = async () => {
    if (!user) return
    if (!confirm('Eliminare tutti i percorsi? Questa azione non è reversibile.')) return
    setBusy(true)
    try {
      const res = await routesService.getUserRoutes(user.$id)
      if (res.success) {
        for (const r of res.data) {
          // best effort sequential deletion
          // eslint-disable-next-line no-await-in-loop
          await routesService.deleteRoute(r.$id)
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-xl">
        <div className="modal-header-primary">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Impostazioni</h2>
            <button onClick={onClose} className="modal-close-btn" aria-label="Chiudi">
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>

        <div className="modal-body space-y-6">
          {/* Unità */}
          <section>
            <h3 className="info-section-title">📏 Unità</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="distanceUnit"
                  value="km"
                  checked={settings.distanceUnit === 'km'}
                  onChange={() => handleChange({ distanceUnit: 'km', elevationUnit: 'm' })}
                />
                <span>Metriche (km, m)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="distanceUnit"
                  value="mi"
                  checked={settings.distanceUnit === 'mi'}
                  onChange={() => handleChange({ distanceUnit: 'mi', elevationUnit: 'ft' })}
                />
                <span>Imperiali (mi, ft)</span>
              </label>
            </div>
          </section>

          {/* Formato ora e tema */}
          <section>
            <h3 className="info-section-title">🖌️ Aspetto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Formato orario</label>
                <select
                  className="input w-full"
                  value={settings.timeFormat}
                  onChange={(e) => handleChange({ timeFormat: e.target.value })}
                >
                  <option value="24h">24 ore</option>
                  <option value="12h">12 ore</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tema</label>
                <select
                  className="input w-full"
                  value={settings.theme}
                  onChange={(e) => handleChange({ theme: e.target.value })}
                >
                  <option value="system">Sistema</option>
                  <option value="light">Chiaro</option>
                  <option value="dark">Scuro</option>
                </select>
              </div>
            </div>
          </section>

          {/* GPS */}
          <section>
            <h3 className="info-section-title">📍 GPS</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Accuratezza massima (m)</label>
                <input
                  type="number"
                  min={5}
                  max={200}
                  className="input w-full"
                  value={settings.gpsAccuracyMax}
                  onChange={(e) => handleChange({ gpsAccuracyMax: Number(e.target.value) || 50 })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Distanza minima tra punti (m)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  className="input w-full"
                  value={settings.minPointDistanceMeters}
                  onChange={(e) => handleChange({ minPointDistanceMeters: Number(e.target.value) || 5 })}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-start gap-1"><FaInfoCircle className="mt-0.5" />
              Punti con accuratezza peggiore del limite o troppo vicini saranno ignorati per ridurre il rumore.
            </p>
          </section>

          {/* Dati e privacy */}
          <section>
            <h3 className="info-section-title">🔐 Dati</h3>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={exportData} disabled={busy || !user} className="btn-secondary flex items-center gap-2">
                <FaDownload /> Esporta i miei dati
              </button>
              <button onClick={deleteAllRoutes} disabled={busy || !user} className="btn-danger flex items-center gap-2">
                <FaTrash /> Elimina tutti i percorsi
              </button>
            </div>
          </section>

          {/* Link legali */}
          <section>
            <h3 className="info-section-title">📄 Documenti</h3>
            <p className="text-sm text-gray-600">Consulta la Privacy Policy nella sezione Informazioni.</p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
