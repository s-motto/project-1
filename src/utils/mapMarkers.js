/**
 * ==========================================
 * MAP MARKERS FACTORY
 * ==========================================
 * 
 * Utility per creare marker HTML personalizzati su mappe Leaflet.
 * Centralizza la logica di creazione marker eliminando duplicazione.
 * 
 * @module utils/mapMarkers
 */

/**
 * Tipi di marker disponibili
 * @enum {string}
 */
export const MarkerType = {
  START: 'start',
  END: 'end',
  WAYPOINT: 'waypoint',
  TEMP: 'temp',
  USER: 'user'
}

/**
 * SVG per marker di partenza (verde)
 */
const START_MARKER_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="32" height="32" fill="#10b981" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
    <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
  </svg>
`

/**
 * SVG per marker di arrivo (rosso)
 */
const END_MARKER_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="32" height="32" fill="#ef4444" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
    <path d="M32 0C49.7 0 64 14.3 64 32V48l69-17.2c38.1-9.5 78.3-5.1 113.5 12.5c46.3 23.2 100.8 23.2 147.1 0l9.6-4.8C423.8 28.1 448 43.1 448 66.1V345.8c0 13.3-8.3 25.3-20.8 30l-34.7 13c-46.2 17.3-97.6 14.6-141.7-7.4c-37.9-19-81.3-23.7-122.5-13.4L64 384v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V400 334 64 32C0 14.3 14.3 0 32 0zM64 187.1l64-13.9v65.5L64 252.6V187.1zm0 96.8l64-13.9v65.5L64 349.4V283.9zM320 128c-13.3 0-24 10.7-24 24s10.7 24 24 24h32c13.3 0 24-10.7 24-24s-10.7-24-24-24H320z"/>
  </svg>
`

/**
 * Crea un marker HTML sulla mappa
 * 
 * @param {Object} map - Istanza Leaflet map
 * @param {MarkerType} type - Tipo di marker
 * @param {Object} position - Posizione {lat, lng}
 * @param {Object} [options] - Opzioni aggiuntive
 * @param {number} [options.index] - Numero waypoint (solo per type=waypoint)
 * @param {number} [options.heading] - Direzione in gradi (solo per type=user)
 * @returns {HTMLElement} Elemento marker creato
 * 
 * @example
 * const marker = createMapMarker(map, MarkerType.START, {lat: 45.4, lng: 9.1})
 * // Per rimuoverlo: marker.remove()
 * 
 * @example
 * // Waypoint numerato
 * const wp = createMapMarker(map, MarkerType.WAYPOINT, {lat: 45.5, lng: 9.2}, {index: 1})
 */
export function createMapMarker(map, type, position, options = {}) {
  const markerDiv = document.createElement('div')
  markerDiv.className = `custom-html-marker ${type}-marker`
  markerDiv.style.position = 'absolute'
  markerDiv.style.zIndex = '400'
  markerDiv.style.pointerEvents = 'none'

  // Seleziona contenuto in base al tipo
  switch (type) {
    case MarkerType.START:
      markerDiv.innerHTML = START_MARKER_SVG
      markerDiv.style.transform = 'translate(-50%, -100%)'
      break

    case MarkerType.END:
      markerDiv.innerHTML = END_MARKER_SVG
      markerDiv.style.transform = 'translate(-50%, -100%)'
      break

    case MarkerType.WAYPOINT:
      markerDiv.innerHTML = `
        <div style="
          background: #f97316;
          color: white;
          border: 3px solid white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 13px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${options.index || '?'}
        </div>
      `
      markerDiv.style.transform = 'translate(-50%, -50%)'
      markerDiv.style.zIndex = '500'
      break

    case MarkerType.TEMP:
      markerDiv.innerHTML = `
        <div style="
          background: #eab308;
          color: white;
          border: 3px solid white;
          border-radius: 50%;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          animation: pulse 1.5s ease-in-out infinite;
        ">
          ?
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        </style>
      `
      markerDiv.style.transform = 'translate(-50%, -50%)'
      markerDiv.style.zIndex = '1000'
      markerDiv.className += ' fade-in-marker'
      break

    case MarkerType.USER:
      const heading = options.heading || 0
      markerDiv.innerHTML = `
        <div style="transform: rotate(${heading}deg); width: 36px; height: 36px;">
          <svg viewBox="0 0 24 24" width="36" height="36">
            <path fill="#2563eb" stroke="#fff" stroke-width="2" 
                  d="M12 2 L4 22 L12 18 L20 22 Z"/>
            <circle cx="12" cy="12" r="3" fill="#fff"/>
          </svg>
        </div>
      `
      markerDiv.style.transform = 'translate(-50%, -50%)'
      markerDiv.style.zIndex = '600'
      break

    default:
      throw new Error(`Tipo marker non valido: ${type}`)
  }

  // Posiziona il marker
  const pixel = map.latLngToContainerPoint([position.lat, position.lng])
  markerDiv.style.left = `${pixel.x}px`
  markerDiv.style.top = `${pixel.y}px`

  // Aggiungi al DOM
  map.getContainer().appendChild(markerDiv)

  return markerDiv
}

/**
 * Aggiorna la posizione di un marker esistente
 * 
 * @param {HTMLElement} marker - Elemento marker da aggiornare
 * @param {Object} map - Istanza Leaflet map
 * @param {Object} position - Nuova posizione {lat, lng}
 * 
 * @example
 * // Muovi marker quando la mappa cambia
 * map.on('move', () => {
 *   updateMarkerPosition(marker, map, {lat: 45.4, lng: 9.1})
 * })
 */
export function updateMarkerPosition(marker, map, position) {
  if (!marker || !map) return

  const pixel = map.latLngToContainerPoint([position.lat, position.lng])
  marker.style.left = `${pixel.x}px`
  marker.style.top = `${pixel.y}px`
}

/**
 * Crea un listener per aggiornare marker durante move/zoom
 * 
 * @param {Object} map - Istanza Leaflet map
 * @param {Array<{marker: HTMLElement, position: Object}>} markers - Array di marker e posizioni
 * @returns {Function} Funzione listener (salvala per rimuoverla dopo)
 * 
 * @example
 * const markers = [
 *   {marker: startMarker, position: {lat: 45.4, lng: 9.1}},
 *   {marker: endMarker, position: {lat: 45.5, lng: 9.2}}
 * ]
 * const listener = createMarkersUpdateListener(map, markers)
 * map.on('move zoom', listener)
 * 
 * // Cleanup:
 * map.off('move zoom', listener)
 */
export function createMarkersUpdateListener(map, markers) {
  return function updateAllMarkers() {
    markers.forEach(({ marker, position }) => {
      updateMarkerPosition(marker, map, position)
    })
  }
}

/**
 * Rimuove tutti i marker specificati
 * 
 * @param {Array<HTMLElement>} markers - Array di marker da rimuovere
 * 
 * @example
 * removeMarkers([startMarker, endMarker, waypointMarker])
 */
export function removeMarkers(markers) {
  markers.forEach(marker => {
    if (marker && marker.remove) {
      marker.remove()
    }
  })
}