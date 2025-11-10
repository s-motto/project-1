// utilità per il calcolo di distanze, dislivelli, velocità e formattazioni legate al GPS

/**
 *calcolo della distanza tra due coordinate GPS usando la formula di Haversine 
 * 
 * @param {number} lat1 - Latitudine punto 1
 * @param {number} lon1 - Longitudine punto 1
 * @param {number} lat2 - Latitudine punto 2
 * @param {number} lon2 - Longitudine punto 2
 * @returns {number} Distanza in km
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Raggio della Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * calcolo della distanza totale da un array di coordinate GPS
 * 
 * @param {Array} coordinates - Array di {lat, lng}
 * @returns {number} Distanza totale in km
 */
export function calculateTotalDistance(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0

  let totalDistance = 0
  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1]
    const curr = coordinates[i]
    totalDistance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
  }

  return totalDistance //  in km
}

/**
 * calcolo del dislivello positivo da un array di coordinate con altitudine
 * 
 * @param {Array} coordinates - Array di {lat, lng, altitude}
 * @returns {number} Dislivello positivo in metri
 */
export function calculateElevationGain(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0

  let gain = 0
  for (let i = 1; i < coordinates.length; i++) {
    const prevAlt = coordinates[i - 1].altitude || 0
    const currAlt = coordinates[i].altitude || 0
    const diff = currAlt - prevAlt
    if (diff > 0) {
      gain += diff
    }
  }

  return Math.round(gain)
}

/**
 * calcolo del dislivello negativo da un array di coordinate con altitudine
 * 
 * @param {Array} coordinates - Array di {lat, lng, altitude}
 * @returns {number} Dislivello negativo in metri
 */
export function calculateElevationLoss(coordinates) {
  if (!coordinates || coordinates.length < 2) return 0

  let loss = 0
  for (let i = 1; i < coordinates.length; i++) {
    const prevAlt = coordinates[i - 1].altitude || 0
    const currAlt = coordinates[i].altitude || 0
    const diff = currAlt - prevAlt
    if (diff < 0) {
      loss += Math.abs(diff)
    }
  }

  return Math.round(loss)
}

/**
 * formatto il tempo in secondi in hh:mm:ss o mm:ss
 * 
 * @param {number} seconds - Secondi totali
 * @returns {string} Tempo formattato
 */
export function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 *calcolo la velocità media in km/h
 * 
 * @param {number} distanceKm - Distanza in km
 * @param {number} timeSeconds - Tempo in secondi
 * @returns {number} Velocità in km/h
 */
export function calculateSpeed(distanceKm, timeSeconds) {
  if (timeSeconds === 0) return 0
  const timeHours = timeSeconds / 3600
  return parseFloat((distanceKm / timeHours).toFixed(1))
}

//conversione e formattazione delle unità di misura
export const KM_TO_MI = 0.621371
export const M_TO_FT = 3.28084

// converto la distanza in base all'unità scelta ("km" | "mi") 
export function convertDistance(distanceKm, unit) {
  return unit === 'mi' ? distanceKm * KM_TO_MI : distanceKm
}

//converto l'altitudine in base all'unità scelta ("m" | "ft")
export function convertElevation(meters, unit) {
  return unit === 'ft' ? meters * M_TO_FT : meters
}

//formatto la distanza usando l'unità data ("km" | "mi")
export function formatDistance(distanceKm, unit) {
  const v = convertDistance(distanceKm, unit)
  const decimals = v < 10 ? 2 : 1
  return `${v.toFixed(decimals)} ${unit}`
}

// formatto la distanza per gli step di navigazione (mostra m/ft per distanze brevi)
export function formatStepDistance(distanceKm, unit) {
  if (unit === 'mi') {
    const miles = distanceKm * KM_TO_MI
    if (miles >= 0.1) return `${miles.toFixed(2)} mi`
    // Per distanze brevi, mostra in piedi
    const feet = Math.round(distanceKm * 1000 * M_TO_FT)
    return `${feet} ft`
  }
  // Unità metrica
  if (distanceKm >= 1) return `${distanceKm.toFixed(2)} km`
  // Per distanze brevi, mostra in metri
  const meters = Math.round(distanceKm * 1000)
  return `${meters} m`
}

//formatto l'altitudine usando l'unità data ("m" | "ft")
export function formatElevation(meters, unit) {
  const v = convertElevation(meters, unit)
  return `${Math.round(v)} ${unit}`
}

//formatto la velocità in base all'unità di distanza data ("km" | "mi")
export function formatSpeedKmh(kmh, distanceUnit) {
  if (distanceUnit === 'mi') {
    const mph = kmh * KM_TO_MI
    return `${mph.toFixed(1)} mph`
  }
  return `${kmh.toFixed(1)} km/h`
}

// formatto la durata in secondi in base allo stile scelto ('hms' | 'short')
export function formatDurationSeconds(seconds, style = 'hms') {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (style === 'short') {
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  return `${m}:${s.toString().padStart(2,'0')}`
}

export function formatDurationMinutes(minutes, style = 'hms') {
  const totalSeconds = Math.round((minutes || 0) * 60)
  return formatDurationSeconds(totalSeconds, style)
}

// formatto una data ISO in stringa leggibile
export function formatTimestamp(isoString, timeFormat = '24h') {
  if (!isoString) return ''
  const d = new Date(isoString)
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h' }
  try {
    return d.toLocaleString('it-IT', opts)
  } catch {
    return d.toISOString().slice(0,16).replace('T',' ')
  }
}

// formatto una data ISO in stringa per nomi di file
export function formatTimestampForFilename(isoString, timeFormat = '24h') {
  if (!isoString) isoString = new Date().toISOString()
  const d = new Date(isoString)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  let hh = d.getHours()
  const min = String(d.getMinutes()).padStart(2, '0')
  if (timeFormat === '12h') {
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const hour12 = String((hh % 12) || 12).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}_${hour12}-${min}${ampm}`
  }
  return `${yyyy}-${mm}-${dd}_${String(hh).padStart(2, '0')}-${min}`
}