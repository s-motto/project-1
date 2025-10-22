import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faFlag, faWalking, faClock, faRoute } from '@fortawesome/free-solid-svg-icons'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const RouteSearchForm = () => {
  // Variabili di stato 
  const [startPoint, setStartPoint] = useState(null)
  const [endPoint, setEndPoint] = useState(null)
  const [map, setMap] = useState(null)
  const [routeLayer, setRouteLayer] = useState(null)
  const [startText, setStartText] = useState('')
  const [endText, setEndText] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // Info sul percorso 
  const [routeInfo, setRouteInfo] = useState(null)
  const [instructions, setInstructions] = useState([])
  // Autocomplete state
  const [startSuggestions, setStartSuggestions] = useState([])
  const [endSuggestions, setEndSuggestions] = useState([])
  const [showStartDropdown, setShowStartDropdown] = useState(false)
  const [showEndDropdown, setShowEndDropdown] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [endLoading, setEndLoading] = useState(false)
  const ORS_KEY = import.meta.env.VITE_OPENROUTE_API_KEY || ''
  const startInputRef = useRef()
  const endInputRef = useRef()
  const [startMarker, setStartMarker] = useState(null)
  const [endMarker, setEndMarker] = useState(null)

  // Inizializza la mappa Leaflet
  
  useEffect(() => {
    const mapInstance = L.map('map').setView([45.4642, 9.1900], 13)
    
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance)
    
    setMap(mapInstance)

    return () => {
      if (mapInstance) {
        mapInstance.remove()
      }
    }
  }, [])

  // Funzione di geocoding usando Nominatim
  const geocodeText = async (text) => {
    if (!text) return null
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=1&countrycodes=it`
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'HikingApp/1.0' }
      })
      if (!resp.ok) return null
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

  // Funzione per ottenere suggerimenti di autocompletamento
  const fetchSuggestions = async (text) => {
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

  // Handle form submission to calculate route
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    setRouteInfo(null)
    setInstructions([])

    let sp = startPoint
    let ep = endPoint

    if (!sp && startText) {
      sp = await geocodeText(startText)
      if (sp) setStartPoint(sp)
    }

    if (!ep && endText) {
      ep = await geocodeText(endText)
      if (ep) setEndPoint(ep)
    }

    if (!sp || !ep) {
      setLoading(false)
      setErrorMsg('Per favore inserisci sia il punto di partenza che quello di arrivo.')
      return
    }

    try {
      // Rimuovi il percorso e i marker esistenti
      if (routeLayer && map) map.removeLayer(routeLayer)
      if (startMarker) map.removeLayer(startMarker)
      if (endMarker) map.removeLayer(endMarker)

      // Chiamata all'API di OpenRouteService
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

      if (!response.ok) {
        console.error('ORS API error:', response.status)
        setErrorMsg('Errore nel calcolo del percorso. Verifica la tua API key.')
        setLoading(false)
        return
      }

      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        
        // Aggiungi il nuovo layer del percorso
        const newRouteLayer = L.geoJSON(feature, {
          style: { color: '#2563eb', weight: 4, opacity: 0.8 }
        }).addTo(map)
        setRouteLayer(newRouteLayer)

        // Aggiungi marker di partenza e arrivo
        const startIcon = L.divIcon({
          html: '<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [24, 24]
        })
        const sMarker = L.marker([sp.lat, sp.lon], { icon: startIcon }).addTo(map)
        setStartMarker(sMarker)

        const endIcon = L.divIcon({
          html: '<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [24, 24]
        })
        const eMarker = L.marker([ep.lat, ep.lon], { icon: endIcon }).addTo(map)
        setEndMarker(eMarker)
        
        map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] })

        // Estrai informazioni sul percorso
        const props = feature.properties
        const summary = props.summary || {}
        
        setRouteInfo({
          distance: (summary.distance / 1000).toFixed(2),
          duration: Math.round(summary.duration / 60),
          ascent: props.ascent ? Math.round(props.ascent) : 0,
          descent: props.descent ? Math.round(props.descent) : 0
        })

        // Estrai le istruzioni dettagliate
        if (props.segments && props.segments[0].steps) {
          setInstructions(props.segments[0].steps)
        }
      } else {
        setErrorMsg('Non è stato possibile calcolare un percorso.')
      }
    } catch (error) {
      console.error('Error:', error)
      setErrorMsg('Errore nel calcolo del percorso.')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-md w-full max-w-xl">
        {/* Start point input */}
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

        {/* End point input */}
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
        </div>
      )}

     {/* Turn-by-turn Instructions */}
{instructions.length > 0 && (
  <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-xl">
    <h3 className="text-lg font-bold mb-3 text-gray-800">Indicazioni Stradali</h3>
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {instructions.map((step, idx) => {
        // Debug: log dello step
        console.log(`Step ${idx}:`, step)
        
        // Prova diversi formati di distanza
        const distance = step.distance || step.length || 0
        const duration = step.duration || step.time || 0
        
        return (
          <div key={idx} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {idx + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                {step.instruction || step.name || 'Continua'}
              </p>
              <p className="text-xs text-gray-500">
                {distance > 0 ? `${(distance / 1000).toFixed(2)} km` : 'N/A'} · {' '}
                {duration > 0 ? `${Math.round(duration / 60)} min` : 'N/A'}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  </div>
)}

      {/* Map container */}
      <div id="map" className="w-full h-[400px] rounded-lg shadow-md" />
    </div>
  )
}

export default RouteSearchForm