import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const DEFAULTS = {
  distanceUnit: 'km', // 'km' | 'mi'
  elevationUnit: 'm', // derived from distanceUnit but persisted for flexibility
  timeFormat: '24h', // '24h' | '12h'
  theme: 'system', // 'system' | 'light' | 'dark'
  language: 'auto', // 'auto' for now
  gpsAccuracyMax: 50, // meters; ignore points worse than this
  minPointDistanceMeters: 5 // ignore GPS jitter below this distance
}

const STORAGE_KEY = 'app_settings_v1'

const SettingsContext = createContext({ settings: DEFAULTS, setSettings: () => {} })

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

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings])

  const value = useMemo(() => ({ settings, setSettings }), [settings])
  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
