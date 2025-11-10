import React, { useMemo, useState, useEffect, useRef } from 'react'
import { FaTimes, FaTrash, FaDownload, FaInfoCircle, FaSpinner } from 'react-icons/fa'
import { useSettings } from '../contexts/SettingsContext'
import { useAuth } from '../contexts/AuthContext'
import routesService from '../services/routesService'
import achievementsService from '../services/achievementsService'

// Componente CustomSelect per selezioni personalizzate
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
      <button
        type="button"
        className="input w-full custom-select-button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected ? selected.label : ''}</span>
        <span className="chevron">▾</span>
      </button>
      {open && (
        <ul className="select-dropdown" role="listbox">
          {options.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`select-option ${opt.disabled ? 'select-option-disabled' : ''}`}
              onClick={() => {
                if (opt.disabled) return
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Componente SettingsModal per la gestione delle impostazioni
const SettingsModal = ({ onClose }) => {
  const { settings, setSettings } = useSettings()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [resetAchievementsToo, setResetAchievementsToo] = useState(false)

  // Effetto per bloccare lo scroll del body quando il modal è aperto
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  // Funzione per gestire i cambiamenti nelle impostazioni
  const handleChange = (patch) => setSettings({ ...settings, ...patch })

  // Funzione per esportare i dati dell'utente
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

  // Funzione per eliminare tutti i percorsi dell'utente
  const deleteAllRoutes = async () => {
    if (!user) return
    setBusy(true)
    try {
      // Elimina tutti i percorsi
      const res = await routesService.getUserRoutes(user.$id)
      if (res.success) {
        for (const r of res.data) {
          await routesService.deleteRoute(r.$id)
        }
      }

      // Se richiesto, azzera anche gli achievements
      if (resetAchievementsToo) {
        await achievementsService.resetAchievements(user.$id)
      }

      setShowDeleteDialog(false)
      setResetAchievementsToo(false)
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
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="distanceUnit"
                  value="km"
                  checked={settings.distanceUnit === 'km'}
                  onChange={() => handleChange({ distanceUnit: 'km', elevationUnit: 'm' })}
                />
                <span className="leading-tight">
                  <span className="block font-medium whitespace-nowrap">Metriche</span>
                  <span
                    className="block text-xs whitespace-nowrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    km, m
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="distanceUnit"
                  value="mi"
                  checked={settings.distanceUnit === 'mi'}
                  onChange={() => handleChange({ distanceUnit: 'mi', elevationUnit: 'ft' })}
                />
                <span className="leading-tight">
                  <span className="block font-medium whitespace-nowrap">Imperiali</span>
                  <span
                    className="block text-xs whitespace-nowrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    mi, ft
                  </span>
                </span>
              </label>
            </div>
          </section>

          {/* Formato ora e tema */}
          <section>
            <h3 className="info-section-title">🖌️ Aspetto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Formato orario
                </label>
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
                <label
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Tema
                </label>
                <CustomSelect
                  value={settings.theme}
                  onChange={(v) => handleChange({ theme: v })}
                  options={[
                    { value: 'light', label: '☀️ Light Mode' },
                    { value: 'dark', label: '🌙 Dark Mode' },
                    { value: 'system', label: '💻 Sistema' },
                  ]}
                />
              </div>
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Formato durata
                </label>
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
                <label
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Accuratezza massima (m)
                </label>
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
                <label
                  className="block text-sm mb-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Distanza minima tra punti (m)
                </label>
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
            <p
              className="text-xs mt-2 flex items-start gap-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              <FaInfoCircle className="mt-0.5" />
              Punti con accuratezza peggiore del limite o troppo vicini saranno ignorati per ridurre il rumore.
            </p>
          </section>

          {/* Dati e privacy */}
          <section>
            <h3 className="info-section-title">🔐 Dati</h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={exportData}
                disabled={busy || !user}
                className="btn-secondary flex items-center gap-2"
              >
                <FaDownload /> Esporta i miei dati
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={busy || !user}
                className="btn-danger flex items-center gap-2"
              >
                <FaTrash /> Elimina tutti i percorsi
              </button>
            </div>
          </section>

          {/* Link legali */}
          <section>
            <h3 className="info-section-title">📄 Documenti</h3>
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Consulta la Privacy Policy nella sezione Informazioni.
            </p>
          </section>
        </div>
      </div>

      {/* Dialog Conferma Eliminazione */}
      {showDeleteDialog && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-content max-w-md">
            <div className="modal-header-primary">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">⚠️ Elimina Tutti i Percorsi</h3>
                <button
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setResetAchievementsToo(false)
                  }}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="modal-body space-y-4">
              <p style={{ color: 'var(--text-primary)' }}>
                Questa operazione eliminerà <strong>tutti i tuoi percorsi completati</strong> e le statistiche associate.
              </p>

              <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                ⚠️ <strong>Attenzione:</strong> Questa azione non è reversibile!
              </p>

              {/* Checkbox per achievements */}
              <label className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="checkbox"
                  checked={resetAchievementsToo}
                  onChange={(e) => setResetAchievementsToo(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    🏆 Azzera anche traguardi e livelli
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Ricomincerai da zero (livello 1, nessun badge)
                  </div>
                </div>
              </label>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setResetAchievementsToo(false)
                  }}
                  className="button-secondary flex-1"
                  disabled={busy}
                >
                  Annulla
                </button>
                <button
                  onClick={deleteAllRoutes}
                  className="btn-danger flex-1 flex items-center justify-center gap-2"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <FaSpinner className="spinner" />
                      Eliminazione...
                    </>
                  ) : (
                    <>
                      <FaTrash />
                      Elimina Tutto
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsModal