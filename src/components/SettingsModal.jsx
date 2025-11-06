import React, { useMemo, useState, useEffect, useRef } from 'react'
import { FaTimes, FaTrash, FaDownload, FaInfoCircle } from 'react-icons/fa'
import { useSettings } from '../contexts/SettingsContext'
import { useAuth } from '../contexts/AuthContext'
import routesService from '../services/routesService'

// Minimal, compact custom select to avoid oversized native dropdowns
const CustomSelect = ({ value, options, onChange, label }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const selected = options.find(o => o.value === value)
  return (
    <div className="custom-select" ref={ref}>
      <button type="button" className="input w-full custom-select-button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{selected ? selected.label : ''}</span>
        <span className="chevron">▾</span>
      </button>
      {open && (
        <ul className="select-dropdown" role="listbox">
          {options.map(opt => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}
                className={`select-option ${opt.disabled ? 'select-option-disabled' : ''}`}
                onClick={() => { if (opt.disabled) return; onChange(opt.value); setOpen(false) }}>
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

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
      a.download = `lets-walk-export_${new Date().toISOString().slice(0, 10)}.json`
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
                <CustomSelect
                  value={settings.timeFormat}
                  onChange={(v) => handleChange({ timeFormat: v })}
                  options={[
                    { value: '24h', label: '24 ore' },
                    { value: '12h', label: '12 ore' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tema</label>
                <CustomSelect
                  value={settings.theme}
                  onChange={(v) => handleChange({ theme: v })}
                  options={[
                    { value: 'system', label: 'Sistema' },
                    { value: 'dark', label: 'Dark Mode (coming soon)', disabled: true },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Formato durata</label>
                <CustomSelect
                  value={settings.durationFormat}
                  onChange={(v) => handleChange({ durationFormat: v })}
                  options={[
                    { value: 'hms', label: 'hh:mm:ss' },
                    { value: 'short', label: 'breve (es. 1h 23m)' },
                  ]}
                />
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
