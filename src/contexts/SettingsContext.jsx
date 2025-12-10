import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_GPS_ACCURACY_MAX,
  DEFAULT_MIN_POINT_DISTANCE_METERS
} from '../constants/trackingConstants'

const DEFAULTS = {
  distanceUnit: 'km', // 'km' | 'mi'
  elevationUnit: 'm', // 'm' | 'ft'
  timeFormat: '24h', // '24h' | '12h'
  durationFormat: 'hms', // 'hms' | 'short'
  theme: 'system', // 'system' | 'light' | 'dark'
  language: 'auto', // 'auto' | 'en' | 'it' | ...
  gpsAccuracyMax: DEFAULT_GPS_ACCURACY_MAX, // default: 150m - ignora posizioni con accuratezza superiore
  minPointDistanceMeters: DEFAULT_MIN_POINT_DISTANCE_METERS // default: 3m - distanza minima tra due punti di traccia
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

  useEffect(() => {
  const applyTheme = (theme) => {
    const root = document.documentElement
    
    if (theme === 'dark') {
      root.classList.add('theme-dark')
    } else if (theme === 'light') {
      root.classList.remove('theme-dark')
    } else if (theme === 'system') {
      // Rileva preferenza sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('theme-dark')
      } else {
        root.classList.remove('theme-dark')
      }
    }
  }
  
  applyTheme(settings.theme)
  
  // Listener per cambiamenti preferenza sistema
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = () => {
    if (settings.theme === 'system') {
      applyTheme('system')
    }
  }
  
  mediaQuery.addEventListener('change', handleChange)
  return () => mediaQuery.removeEventListener('change', handleChange)
}, [settings.theme])
// memoizzo il valore del contesto per evitare render inutili
  const value = useMemo(() => ({ settings, setSettings }), [settings])
  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)