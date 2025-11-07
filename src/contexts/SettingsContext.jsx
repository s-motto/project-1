import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const DEFAULTS = {
  distanceUnit: 'km', // 'km' | 'mi'
  elevationUnit: 'm', // 'm' | 'ft'
  timeFormat: '24h', // '24h' | '12h'
  durationFormat: 'hms', // 'hms' | 'short'
  theme: 'system', // 'system' | 'light' | 'dark'
  language: 'auto', // 'auto' | 'en' | 'it' | ...
  gpsAccuracyMax: 50, // ignora posizioni con accuratezza superiore a questo valore (in metri)
  minPointDistanceMeters: 5 // distanza minima tra due punti di traccia (in metri)
}

const STORAGE_KEY = 'app_settings_v1' //chiave di storage localStorage per le impostazioni 

// Contesto per le impostazioni dell'app
const SettingsContext = createContext({ settings: DEFAULTS, setSettings: () => {} })
// Provider per avvolgere l'app e fornire le impostazioni
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULTS)

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setSettings({ ...DEFAULTS, ...parsed })
      }
    } catch {}
  }, [])

  // salvo le impostazioni su localStorage quando cambiano
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings])
// memoizzo il valore del contesto per evitare render inutili
  const value = useMemo(() => ({ settings, setSettings }), [settings])
  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
