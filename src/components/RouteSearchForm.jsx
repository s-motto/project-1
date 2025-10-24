import React, { useState, useEffect, useRef } from 'react'
import NavigationMode from './NavigationMode'
import SaveRouteButton from './SaveRouteButton'  // ← AGGIUNTO
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faFlag, faWalking, faClock, faRoute, faLocationArrow } from '@fortawesome/free-solid-svg-icons'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const RouteSearchForm = () => {
  const [startPoint, setStartPoint] = useState(null) //latitudine e longitudine
  const [endPoint, setEndPoint] = useState(null) //latitudine e longitudine
  const [map, setMap] = useState(null) //istanza della mappa
  const [routeLayer, setRouteLayer] = useState(null) //layer del percorso
  const [startText, setStartText] = useState('') //testo input partenza
  const [endText, setEndText] = useState('') //testo input arrivo
  const [loading, setLoading] = useState(false) //stato di caricamento
  const [errorMsg, setErrorMsg] = useState('') //messaggi di errore
  const [routeInfo, setRouteInfo] = useState(null) //info del percorso
  const [instructions, setInstructions] = useState([]) //istruzioni passo-passo
  const [startSuggestions, setStartSuggestions] = useState([]) //suggerimenti partenza
  const [endSuggestions, setEndSuggestions] = useState([]) //suggerimenti arrivo
  const [showStartDropdown, setShowStartDropdown] = useState(false) //mostra dropdown partenza
  const [showEndDropdown, setShowEndDropdown] = useState(false) //mostra dropdown arrivo
  const [startLoading, setStartLoading] = useState(false) //caricamento suggerimenti partenza
  const [endLoading, setEndLoading] = useState(false) //caricamento suggerimenti arrivo
  const ORS_KEY = import.meta.env.VITE_OPENROUTE_API_KEY || '' //chiave API OpenRouteService
  const startInputRef = useRef() //riferimento input partenza
  const endInputRef = useRef() //riferimento input arrivo
  const [startMarker, setStartMarker] = useState(null) //marcatore partenza
  const [endMarker, setEndMarker] = useState(null) //marcatore arrivo
  const [isNavigating, setIsNavigating] = useState(false) //stato modalità navigazione
  const [fullRouteData, setFullRouteData] = useState(null) // salva tutti i dati del percorso

  useEffect(() => {
    const mapInstance = L.map('map').setView([45.4642, 9.1900], 13) //Centro su Milano di default
    
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance)
    
    setMap(mapInstance) //Salva l'istanza della mappa nello stato

    return () => {
      //quando il componente viene smontato, rimuovi la mappa
      if (mapInstance) {
        mapInstance.remove()
      }
    }
  }, [])

  const geocodeText = async (text) => { //converte testo in coordinate
    if (!text) return null
    // Chiamata a Nominatim per geocoding
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=1&countrycodes=it`
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'HikingApp/1.0' }
      })
      if (!resp.ok) return null // Controlla se la risposta è valida
      const json = await resp.json()
      if (json.length > 0) {
        return { 
          lat: parseFloat(json[0].lat), 
          lon: parseFloat(json[0].lon), 
          name: json[0].display_name 
        }
      }
      return null
    } catch (err) {
      console.error('Geocoding error:', err)
      return null
    }
  }

  const fetchSuggestions = async (text) => { //ottiene suggerimenti di località
    if (!text || text.length < 2) return []
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5&countrycodes=it`
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'HikingApp/1.0' }
      })
      if (!resp.ok) return []
      const json = await resp.json()
      return json.map(item => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        display_name: item.display_name,
        place_id: item.place_id
      }))
    } catch (err) {
      return []
    }
  }

  const handleSubmit = async (e) => { //gestisce l'invio del form
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    setRouteInfo(null)
    setInstructions([])
    setFullRouteData(null) // ← RESET

    // Ottieni coordinate se non già fornite
    let sp = startPoint
    let ep = endPoint

    // Geocodifica se necessario il punto di partenza
    if (!sp && startText) {
      sp = await geocodeText(startText)
      if (sp) setStartPoint(sp)
    }
// Geocodifica se necessario il punto di arrivo
    if (!ep && endText) {
      ep = await geocodeText(endText)
      if (ep) setEndPoint(ep)
    }
// Controlla che entrambi i punti siano disponibili
    if (!sp || !ep) {
      setLoading(false)
      setErrorMsg('Per favore inserisci sia il punto di partenza che quello di arrivo.')
      return
    }

    try { // Chiamata a OpenRouteService per il calcolo del percorso
       if (routeLayer && map) map.removeLayer(routeLayer)
      if (startMarker && startMarker.element) startMarker.element.remove()
      if (endMarker && endMarker.element) endMarker.element.remove()

      const response = await fetch( 
        'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson',
        {
          method: 'POST',
          headers: {
            'Authorization': ORS_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            coordinates: [[sp.lon, sp.lat], [ep.lon, ep.lat]],
            instructions: true,
            language: 'it',
            units: 'km'
          })
        }
      )

      if (!response.ok) {// Gestione errori dalla API
        console.error('ORS API error:', response.status)
        setErrorMsg('Errore nel calcolo del percorso. Verifica la tua API key.')
        setLoading(false)
        return
      }

      const data = await response.json() // Processa la risposta

      if (data.features && data.features.length > 0) { // Disegna il percorso sulla mappa
        const feature = data.features[0]
        
        const newRouteLayer = L.geoJSON(feature, {
          style: { color: '#2563eb', weight: 4, opacity: 0.8 }
        }).addTo(map)
        setRouteLayer(newRouteLayer)

         // Aggiungi marcatore di partenza con DIV HTML normale (non Leaflet)
        const startMarkerDiv = document.createElement('div')
        startMarkerDiv.className = 'custom-html-marker start-marker'
        startMarkerDiv.innerHTML = `
          <div style="font-size: 32px; color: #10b981; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <i class="fa-solid fa-location-dot"></i>
          </div>
        `
        
        // Converti coordinate in pixel e posiziona
        const startPoint = map.latLngToContainerPoint([sp.lat, sp.lon])
        startMarkerDiv.style.position = 'absolute'
        startMarkerDiv.style.left = `${startPoint.x}px`
        startMarkerDiv.style.top = `${startPoint.y}px`
        startMarkerDiv.style.transform = 'translate(-50%, -100%)'
        startMarkerDiv.style.zIndex = '400'
        startMarkerDiv.style.pointerEvents = 'none'
        
        document.getElementById('map').appendChild(startMarkerDiv)
        setStartMarker({ element: startMarkerDiv, coords: [sp.lat, sp.lon] })

        // Aggiungi marcatore di arrivo con DIV HTML normale
        const endMarkerDiv = document.createElement('div')
        endMarkerDiv.className = 'custom-html-marker end-marker'
        endMarkerDiv.innerHTML = `
          <div style="font-size: 32px; color: #ef4444; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <i class="fa-solid fa-flag-checkered"></i>
          </div>
        `
        
        const endPoint = map.latLngToContainerPoint([ep.lat, ep.lon])
        endMarkerDiv.style.position = 'absolute'
        endMarkerDiv.style.left = `${endPoint.x}px`
        endMarkerDiv.style.top = `${endPoint.y}px`
        endMarkerDiv.style.transform = 'translate(-50%, -100%)'
        endMarkerDiv.style.zIndex = '400'
        endMarkerDiv.style.pointerEvents = 'none'
        
        document.getElementById('map').appendChild(endMarkerDiv)
        setEndMarker({ element: endMarkerDiv, coords: [ep.lat, ep.lon] })
        
        // Aggiorna posizione marker quando si muove/zooma la mappa
        const updateMarkerPositions = () => {
          const newStartPoint = map.latLngToContainerPoint([sp.lat, sp.lon])
          startMarkerDiv.style.left = `${newStartPoint.x}px`
          startMarkerDiv.style.top = `${newStartPoint.y}px`
          
          const newEndPoint = map.latLngToContainerPoint([ep.lat, ep.lon])
          endMarkerDiv.style.left = `${newEndPoint.x}px`
          endMarkerDiv.style.top = `${newEndPoint.y}px`
        }
        
        map.on('move zoom', updateMarkerPositions)
        // Adatta la vista della mappa al percorso
        map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] })

        // Estrai e imposta le informazioni del percorso
        const props = feature.properties
        const summary = props.summary || {}
        
        //imposta le info del percorso
        const routeData = {
          distance: (summary.distance).toFixed(2),
          duration: Math.round(summary.duration / 60),
          ascent: props.ascent ? Math.round(props.ascent) : 0,
          descent: props.descent ? Math.round(props.descent) : 0
        }
        
        // Salva le info del percorso nello stato
        setRouteInfo(routeData)

        // Estrai e imposta le istruzioni passo-passo
        if (props.segments && props.segments[0].steps) {
          setInstructions(props.segments[0].steps)
        }

        // Salva tutti i dati del percorso 
        setFullRouteData({
          startPoint: sp,
          endPoint: ep,
          distance: routeData.distance,
          duration: routeData.duration,
          ascent: routeData.ascent,
          descent: routeData.descent,
          coordinates: feature.geometry.coordinates,
          instructions: props.segments && props.segments[0].steps ? props.segments[0].steps : []
        })
      } else { // Nessun percorso trovato
        setErrorMsg('Non è stato possibile calcolare un percorso.')
      }
    } catch (error) { // Gestione errori generali
      console.error('Error:', error)
      setErrorMsg('Errore nel calcolo del percorso.')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col space-y-4">
      {!isNavigating ? (
        <>
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-md w-full max-w-xl">
            <div className="flex items-center space-x-2 relative">
              <FontAwesomeIcon icon={faLocationDot} className="text-green-600 absolute left-2 z-10" />
              <div className="flex-1">
                <div className="relative">
                  <input
                    ref={startInputRef}
                    placeholder="Punto di partenza"
                    value={startText}
                    autoComplete="off"
                    onFocus={() => { if (startText.length > 1) setShowStartDropdown(true) }}
                    onBlur={() => setTimeout(() => setShowStartDropdown(false), 150)}
                    onChange={async (e) => {
                      const val = e.target.value
                      setStartText(val)
                      setStartPoint(null)
                      if (val.length > 1) {
                        setStartLoading(true)
                        setShowStartDropdown(true)
                        const suggestions = await fetchSuggestions(val)
                        setStartSuggestions(suggestions)
                        setStartLoading(false)
                      } else {
                        setStartSuggestions([])
                        setShowStartDropdown(false)
                      }
                    }}
                    className="pl-10 w-full py-3 h-12 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {showStartDropdown && (startSuggestions.length > 0 || startLoading) && (
                    <ul className="absolute z-20 left-0 right-0 bg-white border rounded shadow max-h-40 overflow-y-auto mt-1">
                      {startLoading && <li className="p-2 text-xs text-gray-400">Caricamento…</li>}
                      {startSuggestions.map((suggestion) => (
                        <li
                          key={suggestion.place_id}
                          className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
                          onMouseDown={() => {
                            setStartText(suggestion.display_name)
                            setStartPoint({
                              lat: suggestion.lat,
                              lon: suggestion.lon,
                              name: suggestion.display_name,
                            })
                            setShowStartDropdown(false)
                            setStartSuggestions([])
                            startInputRef.current.blur()
                          }}
                        >
                          {suggestion.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 relative">
              <FontAwesomeIcon icon={faFlag} className="text-red-600 absolute left-2 z-10" />
              <div className="flex-1">
                <div className="relative">
                  <input
                    ref={endInputRef}
                    placeholder="Punto di arrivo"
                    value={endText}
                    autoComplete="off"
                    onFocus={() => { if (endText.length > 1) setShowEndDropdown(true) }}
                    onBlur={() => setTimeout(() => setShowEndDropdown(false), 150)}
                    onChange={async (e) => {
                      const val = e.target.value
                      setEndText(val)
                      setEndPoint(null)
                      if (val.length > 1) {
                        setEndLoading(true)
                        setShowEndDropdown(true)
                        const suggestions = await fetchSuggestions(val)
                        setEndSuggestions(suggestions)
                        setEndLoading(false)
                      } else {
                        setEndSuggestions([])
                        setShowEndDropdown(false)
                      }
                    }}
                    className="pl-10 w-full py-3 h-12 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {showEndDropdown && (endSuggestions.length > 0 || endLoading) && (
                    <ul className="absolute z-20 left-0 right-0 bg-white border rounded shadow max-h-40 overflow-y-auto mt-1">
                      {endLoading && <li className="p-2 text-xs text-gray-400">Caricamento…</li>}
                      {endSuggestions.map((suggestion) => (
                        <li
                          key={suggestion.place_id}
                          className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
                          onMouseDown={() => {
                            setEndText(suggestion.display_name)
                            setEndPoint({
                              lat: suggestion.lat,
                              lon: suggestion.lon,
                              name: suggestion.display_name,
                            })
                            setShowEndDropdown(false)
                            setEndSuggestions([])
                            endInputRef.current.blur()
                          }}
                        >
                          {suggestion.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Calcolo percorso...' : 'Trova percorso'}
            </button>
          </form>

          {/* Route Information Card */}
          {routeInfo && (
            <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-xl">
              <h3 className="text-lg font-bold mb-3 text-gray-800">Informazioni Percorso</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={faRoute} className="text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Distanza</p>
                    <p className="font-semibold">{routeInfo.distance} km</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={faClock} className="text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Durata</p>
                    <p className="font-semibold">{routeInfo.duration} min</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={faWalking} className="text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Salita</p>
                    <p className="font-semibold">{routeInfo.ascent} m</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={faWalking} className="text-red-600" />
                  <div>
                    <p className="text-xs text-gray-500">Discesa</p>
                    <p className="font-semibold">{routeInfo.descent} m</p>
                  </div>
                </div>
              </div>

              {/* ← QUI AGGIUNGI IL BOTTONE PER SALVARE */}
              <div className="mt-4 pt-4 border-t space-y-2">
                {fullRouteData && <SaveRouteButton routeData={fullRouteData} />}
                
                <button
                  onClick={() => setIsNavigating(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md font-bold flex items-center justify-center space-x-2"
                >
                  <FontAwesomeIcon icon={faLocationArrow} />
                  <span>Inizia Navigazione GPS</span>
                </button>
              </div>
            </div>
          )}

          {/* Turn-by-turn Instructions */}
          {instructions.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-xl">
              <h3 className="text-lg font-bold mb-3 text-gray-800">Indicazioni Stradali</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{step.instruction}</p>
                      <p className="text-xs text-gray-500">
                        {step.distance > 0 
                          ? step.distance >= 1 
                            ? `${step.distance.toFixed(2)} km` 
                            : `${(step.distance * 1000).toFixed(0)} m`
                          : '0 m'
                        } · {Math.round(step.duration / 60)} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <NavigationMode
          map={map}
          routeLayer={routeLayer}
          instructions={instructions}
          endPoint={endPoint}
          onStop={() => setIsNavigating(false)}
        />
      )}

      <div id="map" className="w-full h-[400px] rounded-lg shadow-md" />
    </div>
  )
}

export default RouteSearchForm